// 魔物與地圖管理器 (v0.2.3)
window.game = window.game || {};

window.game.calcMagicDmgToMonster = function(base) {
    let targetMR = window.game.state.targetMonster.mr || 0;
    let d = Math.max(1, Math.floor(base * (100 - targetMR) / 100));
    let tid = window.game.state.targetMonster.id;
    if (tid === 'antaras') d = Math.max(1, Math.floor(d * 0.1));
    if (tid === 'wyrm' || tid === 'death_knight') d = Math.max(1, Math.floor(d * 0.5));
    if (tid === 'black_elder') d = Math.max(1, Math.floor(d * 0.4));
    return d;
};

window.game.takeMagicDmg = function(base) {
    let targetMR = window.game.getMR();
    let d = Math.max(1, Math.floor(base * (100 - targetMR) / 100));
    if (window.game.state.buffs.immune_to_harm) d = Math.max(1, Math.floor(d * 0.7));
    window.game.state.hp -= d;
    return d;
};

window.game.changeMap = function(mapId) {
    if (mapId === 'antaras_lair' && window.game.state.antarasDeadUntil && Date.now() < window.game.state.antarasDeadUntil) {
        window.game.stopBattle();
        window.game.state.currentMap = mapId;
        if (document.getElementById('target-name-arena')) {
            document.getElementById('target-name-arena').innerText = `安塔瑞斯尚未重生... (${Math.ceil((window.game.state.antarasDeadUntil - Date.now()) / 1000)}秒)`;
            document.getElementById('target-name-arena').className = 'c-warn font-bold text-xl tracking-wider text-shadow';
        }
        if (document.getElementById('target-hp-container-arena')) {
            document.getElementById('target-hp-container-arena').classList.add('hidden');
        }
        window.game.logSystem(`移動到了 ${window.MAPS[mapId].name}。但安塔瑞斯尚未重生。`);
        setTimeout(() => { if(window.game.state.isPlaying && window.game.state.currentMap === 'antaras_lair') window.game.spawnMonster(); }, 5000);
        return;
    }

    window.game.state.currentMap = mapId;
    window.game.logSystem(`移動到了 ${window.MAPS[mapId].name}。`);
    window.game.stopBattle();
    window.game.state.targetMonster = null;
    if (document.getElementById('target-name-arena')) {
        document.getElementById('target-name-arena').innerText = '尋找目標中...';
        document.getElementById('target-name-arena').className = 'c-err font-black text-xl tracking-wider text-shadow';
    }
    if (document.getElementById('target-hp-container-arena')) {
        document.getElementById('target-hp-container-arena').classList.add('hidden');
    }
    setTimeout(() => window.game.startBattle(), 1000);
};

window.game.spawnMonster = function() {
    if(window.game.state.hp <= 0) return;
    
    if (window.game.state.currentMap === 'antaras_lair' && window.game.state.antarasDeadUntil && Date.now() < window.game.state.antarasDeadUntil) {
        if (document.getElementById('target-name-arena')) {
            document.getElementById('target-name-arena').innerText = `安塔瑞斯尚未重生... (${Math.ceil((window.game.state.antarasDeadUntil - Date.now()) / 1000)}秒)`;
            document.getElementById('target-name-arena').className = 'c-warn font-bold text-xl tracking-wider text-shadow';
        }
        if (document.getElementById('target-hp-container-arena')) {
            document.getElementById('target-hp-container-arena').classList.add('hidden');
        }
        setTimeout(() => { if(window.game.state.isPlaying && window.game.state.currentMap === 'antaras_lair') window.game.spawnMonster(); }, 5000);
        return;
    }

    const map = window.MAPS[window.game.state.currentMap];
    if (!map) {
        window.game.logSystem(`未知的地圖資料，自動返回騎士村。`, 'warn');
        window.game.state.currentMap = 'knight_village';
        if (document.getElementById('win-map-select')) {
            document.getElementById('win-map-select').value = 'knight_village';
        }
        return window.game.spawnMonster();
    }

    let totalW = map.monsters.reduce((s, m) => s + m.weight, 0);
    let r = Math.random() * totalW;
    let selected = map.monsters[0];
    for(let m of map.monsters) { if(r < m.weight) { selected = m; break; } r -= m.weight; }
    
    window.game.state.targetMonster = { ...selected, maxHp: selected.hp, debuffs: {} };
    window.game.state.zombieTick = 0;
    window.game.state.monsterSpecialTick = 0;
    
    let availSpells = window.game.getAvailableSpells();
    if (selected.name === '史巴托' && availSpells.includes('detection') && window.game.state.level >= window.SPELLS['detection'].level * 4) {
        window.game.state.targetMonster.debuffs.sleep = 5;
        window.game.logCombat(`【無所遁形術】看破了史巴托的潛伏，使其停止行動 5 秒。`, 'info');
    }
    
    window.game.updateUI();
    if (document.getElementById('target-hp-container-arena')) {
        document.getElementById('target-hp-container-arena').classList.remove('hidden');
    }
    window.game.updateMonsterHpBar();
};

window.game.updateMonsterHpBar = function() {
    if(!window.game.state.targetMonster) return;
    if (document.getElementById('target-hp-bar-arena')) {
        document.getElementById('target-hp-bar-arena').style.width = `${Math.max(0, (window.game.state.targetMonster.hp/window.game.state.targetMonster.maxHp)*100)}%`;
    }
};

window.game.monsterAttack = function() {
    if(!window.game.state.targetMonster || window.game.state.hp <= 0) return;
    
    if (window.game.state.buffs.tame_monster && !window.game.state.targetMonster.isBoss) {
        if (Math.random() < (1 / window.game.state.targetMonster.level)) {
            let p = window.game.state.targetMonster.dice.split('+');
            let selfDmg = window.rollDice(p[0]) + (p[1] ? parseInt(p[1]) : 0);
            window.game.state.targetMonster.hp -= selfDmg;
            window.game.logCombat(`${window.game.state.targetMonster.name} 被迷魅，攻擊了自己造成 ${selfDmg} 點傷害！`, 'success');
            window.game.updateMonsterHpBar();
            if(window.game.state.targetMonster.hp <= 0) window.game.monsterDied();
            return;
        }
    }
    
    if(Math.random()*100 <= window.game.getER()) {
        window.game.logCombat(`你閃避了 ${window.game.state.targetMonster.name} 的攻擊！`, 'success');
        return;
    }
    
    let roll = window.rollDice('1d20');
    let isHit = false; let isCrit = false;
    let dbf = window.game.state.targetMonster.debuffs || {};
    let darknessPenalty = (dbf.darkness > 0) ? -5 : 0;
    let diseasePenalty = (dbf.disease > 0) ? -4 : 0;
    
    let monsterLvl = window.game.state.targetMonster.level;
    let extraHit = Math.floor(monsterLvl / 2) + Math.floor(monsterLvl / 10) * 2;
    if (window.game.state.targetMonster.hitBonus) extraHit += window.game.state.targetMonster.hitBonus;
    
    if(roll === 1) isHit = false;
    else if(roll === 20) { isHit = true; isCrit = true; }
    else if(roll + extraHit + darknessPenalty + diseasePenalty + (window.game.state.targetMonster.level - window.game.state.level) >= 10 - window.game.getAC()) isHit = true;
    
    if(isHit) {
        let parts = window.game.state.targetMonster.dice.split('+');
        let dDmg = isCrit ? parseInt(parts[0].split('d')[1]) : window.rollDice(parts[0]);
        let baseD = parts[1] ? parseInt(parts[1]) : 0;
        if (dbf.weapon_break > 0) baseD -= 10;
        
        let dr = window.game.getDamageReduction();
        let dmg = Math.max(1, dDmg + baseD - dr); 
        if (window.game.state.buffs.immune_to_harm) dmg = Math.max(1, Math.floor(dmg * 0.7));
        
        window.game.state.hp -= dmg;
        window.game.logCombat(`${window.game.state.targetMonster.name} 命中了你，造成 ${dmg} 點傷害。`, 'danger');
        window.game.updateUI();
        
        window.game.checkPlayerDeath();
    } else {
        window.game.logCombat(`${window.game.state.targetMonster.name} 的攻擊未命中。`);
    }
};

window.game.monsterDied = function() {
    let m = window.game.state.targetMonster;
    window.game.state.exp += m.exp * window.RateXp;
    
    let multi = m.isBoss ? 10 : 1;
    let goldMsg = '';
    if (Math.random() < 0.70) {
        let adena = (m.adena[0] + Math.floor(Math.random()*(m.adena[1]-m.adena[0]+1))) * window.RateDropAdena;
        window.game.state.adena += adena;
        if (adena > 0) goldMsg = `獲得 ${adena} 金幣。`;
    }
    
    if (goldMsg) window.game.logSystem(`擊敗了 ${m.name}。${goldMsg}`);
    else window.game.logSystem(`擊敗了 ${m.name}。`);
    
    let lv = m.level;
    
    if (lv >= 11) {
        if(Math.random()*100 < 0.5 * multi * window.RateDropItems) { window.game.addInventory('scroll_armor',1,0,false); window.game.logSystem(`${m.name} 給你 對盔甲施法的卷軸。`, 'reward'); }
        if(Math.random()*100 < 0.01 * multi * window.RateDropItems) { window.game.addInventory('scroll_armor_blessed',1,0,false); window.game.logSystem(`${m.name} 給你 受祝福的 對盔甲施法的卷軸。`, 'blessed'); }
    }
    if (lv >= 21) {
        if(Math.random()*100 < 0.5 * multi * window.RateDropItems) { window.game.addInventory('scroll_weapon',1,0,false); window.game.logSystem(`${m.name} 給你 對武器施法的卷軸。`, 'reward'); }
        if(Math.random()*100 < 0.01 * multi * window.RateDropItems) { window.game.addInventory('scroll_weapon_blessed',1,0,false); window.game.logSystem(`${m.name} 給你 受祝福的 對武器施法的卷軸。`, 'blessed'); }
    }
    if (lv >= 31) {
        if(Math.random()*100 < 0.1 * multi * window.RateDropItems) { window.game.addInventory('scroll_accessory',1,0,false); window.game.logSystem(`${m.name} 給你 對飾品施法的卷軸。`, 'reward'); }
    }
    
    if(m.drops) {
        m.drops.forEach(d => { 
            if(Math.random()*100 < d.rate * multi * window.RateDropItems) {
                if(window.ITEMS[d.id] && window.ITEMS[d.id].type === 'book' && window.game.state.spells.includes(window.ITEMS[d.id].spellId)) {
                    let sell = 100 * Math.pow(window.SPELLS[window.ITEMS[d.id].spellId].level, 2);
                    window.game.state.adena += sell;
                    window.game.logSystem(`賣出重複的 ${window.ITEMS[d.id].name} 獲得 ${sell} 金幣。`);
                } else if (window.ITEMS[d.id]) {
                    let isEquip = ['weapon','helmet','armor','shield','cloak','boots','leggings','gloves','amulet','earring','belt','ring'].includes(window.ITEMS[d.id].type);
                    let isBlessed = false;
                    if (isEquip && Math.random() < 0.01) isBlessed = true;

                    let canAdd = true;
                    if (window.ITEMS[d.id].unique) {
                        for (let k in window.game.state.inventory) {
                            if (window.game.state.inventory[k].itemId === d.id) canAdd = false;
                        }
                    }

                    if (canAdd) {
                        window.game.addInventory(d.id, 1, 0, isBlessed);
                        let def = window.ITEMS[d.id];
                        let name = def.name;
                        if (def.isUndeadSlayer) name += ' (弱點加成)';
                        if (isBlessed) name = '受祝福的 ' + name;
                        
                        let logType = isBlessed ? 'blessed' : 'reward';
                        window.game.logSystem(`${m.name} 給你 ${name}。`, logType);
                    }
                }
            }
        });
    }
    
    if (m.id === 'antaras') window.game.state.antarasDeadUntil = Date.now() + 600000;

    if (document.getElementById('target-name-arena')) {
        document.getElementById('target-name-arena').innerText = '尋找目標中...';
        document.getElementById('target-name-arena').className = 'c-err font-black text-xl tracking-wider text-shadow';
    }
    if (document.getElementById('target-hp-container-arena')) {
        document.getElementById('target-hp-container-arena').classList.add('hidden');
    }
    
    window.game.state.targetMonster = null;
    window.game.checkLevelUp();
    window.game.updateUI();
    
    if (window.game.state.currentMap === 'antaras_lair' && m.id === 'antaras') {
        setTimeout(() => { if(window.game.state.isPlaying) window.game.spawnMonster(); }, 1000);
    } else {
        setTimeout(() => { if(window.game.state.isPlaying) window.game.spawnMonster(); }, 500);
    }
};

window.MAPS = {
    knight_village: { name: '騎士村周邊', monsters: [
        { id: 'goblin', name: '哥布林', level: 2, hp: 3, ac: 10, exp: 5, atkSpeed: 2000, dice: '1d4', weight: 98, adena: [10,30], drops: [{id:'broadsword', rate: 1}, {id:'book_light', rate: 1}, {id:'book_shield', rate: 0.5}] },
        { id: 'orc', name: '妖魔', level: 2, hp: 6, ac: 10, exp: 5, atkSpeed: 2000, dice: '1d4', weight: 98, adena: [10,30], drops: [{id:'dagger_orc', rate: 1}, {id:'short_sword_orc', rate: 5}, {id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'book_light', rate: 1}] },
        { id: 'earth_spirit', name: '地靈', level: 3, hp: 7, ac: 10, exp: 10, atkSpeed: 2000, dice: '1d6', weight: 97, adena: [11,32], drops: [{id:'club', rate: 1}, {id:'boots_short', rate: 1}, {id:'book_light', rate: 1}] },
        { id: 'orc_archer', name: '妖魔弓箭手', level: 3, hp: 12, ac: 10, exp: 10, atkSpeed: 3000, dice: '1d2+1d6', weight: 97, adena: [11,32], drops: [{id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'chain_mail_orc', rate: 1}, {id:'book_light', rate: 1}] },
        { id: 'gnome', name: '侏儒', level: 5, hp: 30, ac: 10, exp: 26, atkSpeed: 2000, dice: '1d6+1', weight: 95, adena: [13,36], drops: [{id:'short_sword_gnome', rate: 1}, {id:'helm_gnome', rate: 0.5}, {id:'cloak_gnome', rate: 5}, {id:'shield_gnome', rate: 8}, {id:'book_shield', rate: 0.5}] }
    ]},
    desert: { name: '風木沙漠周邊', monsters: [
        { id: 'earth_spirit', name: '地靈', level: 3, hp: 7, ac: 10, exp: 10, atkSpeed: 2000, dice: '1d6', weight: 97, adena: [11,32], drops: [{id:'club', rate: 1}, {id:'boots_short', rate: 1}, {id:'book_light', rate: 1}] },
        { id: 'orc_archer', name: '妖魔弓箭手', level: 3, hp: 12, ac: 10, exp: 10, atkSpeed: 3000, dice: '1d2+1d6', weight: 97, adena: [11,32], drops: [{id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'chain_mail_orc', rate: 1}, {id:'book_light', rate: 1}] },
        { id: 'gnome', name: '侏儒', level: 5, hp: 30, ac: 10, exp: 26, atkSpeed: 2000, dice: '1d6+1', weight: 95, adena: [13,36], drops: [{id:'short_sword_gnome', rate: 1}, {id:'helm_gnome', rate: 0.5}, {id:'cloak_gnome', rate: 5}, {id:'shield_gnome', rate: 8}, {id:'book_shield', rate: 0.5}] },
        { id: 'werewolf', name: '狼人', level: 9, hp: 50, ac: 4, exp: 82, atkSpeed: 2000, dice: '1d8+2', isWerewolf: true, weight: 91, adena: [22,50], drops: [{id:'long_sword', rate: 2}, {id:'studded_leather', rate: 3}, {id:'boots_short', rate: 1}, {id:'boots_long', rate: 0.3}, {id:'book_shield', rate: 0.5}, {id:'book_dex', rate: 0.5}, {id:'book_vampire', rate: 0.5}] },
        { id: 'lycan', name: '萊肯', level: 17, hp: 120, ac: -4, exp: 26, atkSpeed: 2000, dice: '1d12+3', isWerewolf: true, weight: 83, adena: [56,102], drops: [{id:'fauchard', rate: 1}, {id:'battle_axe', rate: 2}, {id:'scale_mail', rate: 4}, {id:'studded_leather', rate: 3}, {id:'boots_long', rate: 0.3}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'book_vampire', rate: 0.5}, {id:'book_slow', rate: 0.5}] }
    ]},
    knight_cave_1f: { name: '騎士洞穴1樓', monsters: [
        { id: 'orc', name: '妖魔', level: 2, hp: 6, ac: 10, exp: 5, atkSpeed: 2000, dice: '1d4', weight: 98, adena: [10,30], drops: [{id:'dagger_orc', rate: 1}, {id:'short_sword_orc', rate: 5}, {id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'book_light', rate: 1}] },
        { id: 'orc_archer', name: '妖魔弓箭手', level: 3, hp: 12, ac: 10, exp: 10, atkSpeed: 3000, dice: '1d2+1d6', weight: 97, adena: [11,32], drops: [{id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'chain_mail_orc', rate: 1}, {id:'book_light', rate: 1}] },
        { id: 'werewolf', name: '狼人', level: 9, hp: 50, ac: 4, exp: 82, atkSpeed: 2000, dice: '1d8+2', weight: 91, adena: [22,50], drops: [{id:'long_sword', rate: 2}, {id:'studded_leather', rate: 3}, {id:'boots_short', rate: 1}, {id:'boots_long', rate: 0.3}, {id:'book_shield', rate: 0.5}, {id:'book_dex', rate: 0.5}, {id:'book_vampire', rate: 0.5}] },
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 94, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'orc_fighter', name: '妖魔鬥士', level: 8, hp: 50, ac: 5, exp: 65, atkSpeed: 2000, dice: '1d12', weight: 92, adena: [20,45], drops: [{id:'helm_orc', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'orc_cloak', rate: 5}, {id:'antic_chain_mail', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'chain_mail_orc', rate: 1}, {id:'arkai_shield', rate: 10}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 86, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] }
    ]},
    knight_cave_2f: { name: '騎士洞穴2樓', monsters: [
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 20, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] }
    ]},
    knight_cave_3f: { name: '騎士洞穴3樓', monsters: [
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'troll_king', name: '食人妖精王', level: 30, hp: 400, ac: -13, exp: 901, atkSpeed: 2000, dice: '4d8+6', hitBonus: 5, weight: 70, adena: [153,254], drops: [{id:'club', rate: 5}, {id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_disease', rate: 0.1}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] }
    ]},
    knight_cave_4f: { name: '騎士洞穴4樓', monsters: [
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'troll_king', name: '食人妖精王', level: 30, hp: 400, ac: -13, exp: 901, atkSpeed: 2000, dice: '4d8+6', hitBonus: 5, weight: 70, adena: [153,254], drops: [{id:'club', rate: 5}, {id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_disease', rate: 0.1}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] }
    ]},
    gludio_dungeon: { name: '古魯丁地監周邊', monsters: [
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 10, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_cure_path', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 10, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 8, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'ogre', name: '歐吉', level: 28, hp: 500, ac: -18, exp: 785, atkSpeed: 2000, dice: '4d10+8', weight: 72, adena: [135,225], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'belt_ogre', rate: 0.05}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'elder', name: '長者', level: 21, hp: 250, ac: -5, exp: 442, atkSpeed: 2000, dice: '2d8+5', weight: 79, adena: [80,140], drops: [{id:'cloak_protector', rate: 5}, {id:'book_call_lightning', rate: 0.8}, {id:'book_high_heal', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_lightning_storm', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'book_heal', rate: 1}, {id:'book_mid_heal', rate: 0.8}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'casto', name: '卡司特', level: 21, hp: 200, ac: -10, exp: 442, atkSpeed: 2000, dice: '4d8+3', hitBonus: 5, weight: 79, adena: [80,140], drops: [{id:'battle_axe', rate: 2}, {id:'giant_axe', rate: 2}, {id:'book_slow', rate: 0.5}, {id:'book_summon', rate: 0.02}] },
        { id: 'casto_king', name: '卡司特王', level: 33, hp: 300, ac: -13, exp: 1090, atkSpeed: 2000, dice: '4d12+5', hitBonus: 5, weight: 67, adena: [184,302], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_heal_magic', rate: 0.5}, {id:'book_slow', rate: 0.5}, {id:'book_full_heal', rate: 0.1}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] }
    ]},
    gludio_1f: { name: '古魯丁地監1樓', monsters: [
        { id: 'orc', name: '妖魔', level: 2, hp: 6, ac: 10, exp: 5, atkSpeed: 2000, dice: '1d4', weight: 98, adena: [10,30], drops: [{id:'dagger_orc', rate: 1}, {id:'short_sword_orc', rate: 5}, {id:'helm_orc', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'book_light', rate: 1}] },
        { id: 'orc_fighter', name: '妖魔鬥士', level: 8, hp: 50, ac: 5, exp: 65, atkSpeed: 2000, dice: '1d12', weight: 92, adena: [20,45], drops: [{id:'helm_orc', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'orc_cloak', rate: 5}, {id:'antic_chain_mail', rate: 1}, {id:'ring_mail_orc', rate: 5}, {id:'chain_mail_orc', rate: 1}, {id:'arkai_shield', rate: 10}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'helm_skeleton', rate: 1}, {id:'armor_skeleton', rate: 1}, {id:'shield_skeleton', rate: 1}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}] }
    ]},
    gludio_2f: { name: '古魯丁地監2樓', monsters: [
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 85, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'helm_skeleton', rate: 1}, {id:'armor_skeleton', rate: 1}, {id:'shield_skeleton', rate: 1}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 86, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] }
    ]},
    gludio_3f: { name: '古魯丁地監3樓', monsters: [
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 85, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'helm_skeleton', rate: 1}, {id:'armor_skeleton', rate: 1}, {id:'shield_skeleton', rate: 1}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 86, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] }
    ]},
    gludio_4f: { name: '古魯丁地監4樓', monsters: [
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 85, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'helm_skeleton', rate: 1}, {id:'armor_skeleton', rate: 1}, {id:'shield_skeleton', rate: 1}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 86, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] }
    ]},
    gludio_5f: { name: '古魯丁地監5樓', monsters: [
        { id: 'zombie', name: '人形殭屍', level: 6, hp: 45, ac: 8, exp: 37, atkSpeed: 2000, dice: '2d4', isUndead: true, weight: 85, adena: [10,120], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_dark', rate: 0.1}, {id:'book_zombie', rate: 0.1}] },
        { id: 'skeleton', name: '骷髏', level: 10, hp: 80, ac: 3, exp: 101, atkSpeed: 2000, dice: '1d8+4', isUndead: true, weight: 90, adena: [25,54], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}, {id:'book_dex', rate: 0.5}, {id:'helm_skeleton', rate: 1}, {id:'armor_skeleton', rate: 1}, {id:'shield_skeleton', rate: 1}] },
        { id: 'cerberus', name: '夏洛伯', level: 14, hp: 100, ac: 3, exp: 101, atkSpeed: 1000, dice: '1d8+1', weight: 86, adena: [41,78], drops: [{id:'book_slow', rate: 0.5}, {id:'book_earth', rate: 0.1}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] },
        { id: 'death_knight', name: '死亡騎士', level: 85, hp: 50000, ac: -80, exp: 7226, atkSpeed: 1000, dice: '5d8+16', hitBonus: 40, isBoss: true, weight: 15, adena: [1500,3000], drops: [
            {id:'katana', rate: 10}, {id:'sword_two_handed', rate: 10}, {id:'sword_dk_fire', rate: 1}, {id:'helm_dk', rate: 5}, {id:'armor_dk', rate: 5}, {id:'gloves_dk', rate: 5}, {id:'boots_dk', rate: 5},
            {id:'antic_chain_mail', rate: 10}, {id:'armor_metal', rate: 10}, {id:'gloves_normal', rate: 10}, {id:'amulet_str', rate: 3}, {id:'ring_wind', rate: 1.5}, {id:'belt_soul', rate: 0.1}, {id:'belt_mind', rate: 0.1},
            {id:'book_vampire', rate: 5}, {id:'book_tame', rate: 3}, {id:'book_str_buff', rate: 1}, {id:'book_fire_arrow', rate: 2}, {id:'book_tornado', rate: 1}, {id:'book_disease', rate: 1}, {id:'book_resurrect', rate: 50}, {id:'book_immune', rate: 0.3}, {id:'book_fire_storm', rate: 0.5}
        ] }
    ]},
    gludio_6f: { name: '古魯丁地監6樓', monsters: [
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] },
        { id: 'troll_king', name: '食人妖精王', level: 30, hp: 400, ac: -13, exp: 901, atkSpeed: 2000, dice: '4d8+6', hitBonus: 5, weight: 70, adena: [153,254], drops: [{id:'club', rate: 5}, {id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_disease', rate: 0.1}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'wizard', name: '魔法師', level: 42, hp: 800, ac: -32, exp: 1765, atkSpeed: 2000, dice: '4d10+7', hitBonus: 13, weight: 58, adena: [292,470], drops: [{id:'staff_mana', rate: 1}, {id:'cloak_protector', rate: 5}, {id:'gloves_normal', rate: 1}, {id:'amulet_dex', rate: 0.1}, {id:'amulet_str', rate: 0.3}, {id:'amulet_int', rate: 0.1}, {id:'amulet_wis', rate: 0.1}, {id:'book_high_heal', rate: 0.5}, {id:'book_dex', rate: 0.5}, {id:'book_call_lightning', rate: 0.8}, {id:'book_greater_haste', rate: 0.1}] }
    ]},
    gludio_7f: { name: '古魯丁地監7樓', monsters: [
        { id: 'ghoul', name: '食屍鬼', level: 16, hp: 110, ac: -4, exp: 257, atkSpeed: 2000, dice: '2d10+3', isUndead: true, weight: 84, adena: [50,93], drops: [{id:'book_slow', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_berserker', rate: 0.1}, {id:'book_enchant_weapon', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}, {id:'dagger_mithril', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'troll', name: '食人妖精', level: 22, hp: 250, ac: -6, exp: 485, atkSpeed: 2000, dice: '3d8+5', hitBonus: 3, weight: 78, adena: [46,359], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_fire_arrow', rate: 0.2}] },
        { id: 'hellhound', name: '地獄犬', level: 24, hp: 120, ac: -20, exp: 577, atkSpeed: 2000, dice: '3d10+3', hitBonus: 3, weight: 76, adena: [102,173], drops: [{id:'magic_staff', rate: 2}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_immune', rate: 0.03}] },
        { id: 'troll_king', name: '食人妖精王', level: 30, hp: 400, ac: -13, exp: 901, atkSpeed: 2000, dice: '4d8+6', hitBonus: 5, weight: 70, adena: [153,254], drops: [{id:'club', rate: 5}, {id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_disease', rate: 0.1}, {id:'dagger_ori', rate: 0.1}] }
    ]},
    dragon_valley: { name: '龍之谷', monsters: [
        { id: 'ogre', name: '歐吉', level: 28, hp: 500, ac: -18, exp: 785, atkSpeed: 2000, dice: '4d10+8', weight: 72, adena: [135,225], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'belt_ogre', rate: 0.05}, {id:'gloves_str', rate: 0.05}, {id:'dagger_ori', rate: 0.1}] },
        { id: 'skeleton_guard', name: '骷髏警衛', level: 27, hp: 270, ac: -15, exp: 730, atkSpeed: 2000, dice: '4d10', hitBonus: 5, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'steel_helmet', rate: 1}, {id:'broad_spear', rate: 5}] },
        { id: 'skeleton_marksman', name: '骷髏神射手', level: 27, hp: 250, ac: -15, exp: 730, atkSpeed: 2000, dice: '2d15+10', hitBonus: 9, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}] },
        { id: 'skeleton_fighter', name: '骷髏鬥士', level: 29, hp: 280, ac: -15, exp: 842, atkSpeed: 2000, dice: '3d10+10', hitBonus: 5, isUndead: true, weight: 71, adena: [70,210], drops: [{id:'ring', rate: 0.8}, {id:'book_dex', rate: 0.5}, {id:'book_haste', rate: 0.1}, {id:'battle_axe', rate: 2}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}] },
        { id: 'scorpion', name: '毒蠍', level: 26, hp: 200, ac: -15, exp: 677, atkSpeed: 2000, dice: '4d6+12', hitBonus: 5, weight: 74, adena: [60,150], drops: [{id:'helm_dex_magic', rate: 0.5}, {id:'book_call_lightning', rate: 0.8}, {id:'book_cancel', rate: 0.1}, {id:'book_quake', rate: 0.05}] },
        { id: 'arian', name: '亞力安', level: 34, hp: 500, ac: -20, exp: 1157, atkSpeed: 2000, dice: '4d8+8', hitBonus: 7, weight: 66, adena: [0,0], drops: [{id:'book_high_heal', rate: 0.5}, {id:'book_slow', rate: 0.5}, {id:'book_earth_prison', rate: 0.6}, {id:'book_haste', rate: 0.1}, {id:'book_earth', rate: 0.1}, {id:'book_quake', rate: 0.05}, {id:'book_greater_haste', rate: 0.1}] },
        { id: 'harpy', name: '哈維', level: 26, hp: 230, ac: -18, exp: 677, atkSpeed: 1000, dice: '2d8+8', hitBonus: 9, weight: 74, adena: [118,198], drops: [{id:'book_vampire', rate: 0.5}, {id:'book_haste', rate: 0.1}, {id:'book_greater_haste', rate: 0.1}, {id:'ring_harpy', rate: 0.01}] },
        { id: 'black_elder', name: '黑長者', level: 72, hp: 24000, ac: -90, exp: 5185, atkSpeed: 2000, dice: '9d8+8', hitBonus: 30, isBoss: true, weight: 26, adena: [0,0], drops: [{id:'hammer_thor', rate: 0.005}, {id:'robe_black_elder', rate: 0.05}, {id:'sandals_black_elder', rate: 0.05}, {id:'book_blizzard', rate: 0.1}, {id:'book_tornado', rate: 0.1}, {id:'helm_antic_magic', rate: 0.1}, {id:'antic_cloak', rate: 1}, {id:'gloves_normal', rate: 1}] },
        { id: 'wyrm', name: '飛龍', level: 76, hp: 26000, ac: -90, exp: 5777, atkSpeed: 2000, dice: '9d8+12', hitBonus: 35, isBoss: true, weight: 24, adena: [0,0], drops: [{id:'dagger_ori', rate: 0.1}, {id:'book_fireball', rate: 0.5}, {id:'book_weapon_break', rate: 0.4}, {id:'book_tame', rate: 0.3}, {id:'book_str_buff', rate: 0.1}, {id:'book_haste', rate: 0.1}, {id:'book_summon', rate: 0.02}, {id:'book_greater_haste', rate: 0.1}, {id:'book_quake', rate: 0.05}, {id:'wyrm_claw', rate: 0.5}] }
    ]},
    dragon_valley_1f: { name: '龍之谷地監1樓', monsters: [
        { id: 'spartoi', name: '史巴托', level: 16, hp: 120, ac: -3, exp: 257, atkSpeed: 2000, dice: '3d6+4', hitBonus: 2, isUndead: true, weight: 84, adena: [50,93], drops: [{id:'scimitar', rate: 1}, {id:'steel_helmet', rate: 1}, {id:'shield_large', rate: 3}, {id:'armor_bronze', rate: 0.3}, {id:'book_enchant_weapon', rate: 0.5}, {id:'book_detection', rate: 0.5}] },
        { id: 'yangolian', name: '楊果里恩', level: 18, hp: 200, ac: -5, exp: 325, atkSpeed: 1000, dice: '2d8+3', hitBonus: 2, weight: 82, adena: [61,110], drops: [{id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_sleep_mist', rate: 0.2}] },
        { id: 'skeleton_guard', name: '骷髏警衛', level: 27, hp: 270, ac: -15, exp: 730, atkSpeed: 2000, dice: '4d10', hitBonus: 5, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'steel_helmet', rate: 1}, {id:'broad_spear', rate: 5}] },
        { id: 'skeleton_marksman', name: '骷髏神射手', level: 27, hp: 250, ac: -15, exp: 730, atkSpeed: 2000, dice: '2d15+10', hitBonus: 9, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}] },
        { id: 'skeleton_fighter', name: '骷髏鬥士', level: 29, hp: 280, ac: -15, exp: 842, atkSpeed: 2000, dice: '3d10+10', hitBonus: 5, isUndead: true, weight: 71, adena: [70,210], drops: [{id:'ring', rate: 0.8}, {id:'book_dex', rate: 0.5}, {id:'book_haste', rate: 0.1}, {id:'battle_axe', rate: 2}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}] },
        { id: 'doro', name: '多羅', level: 28, hp: 270, ac: -15, exp: 785, atkSpeed: 2000, dice: '4d10', hitBonus: 5, weight: 72, adena: [135,225], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_heal_magic', rate: 0.5}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'belt_doro', rate: 0.3}, {id:'book_high_heal', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_full_heal', rate: 0.1}] }
    ]},
    dragon_valley_2f: { name: '龍之谷地監2樓', monsters: [
        { id: 'skeleton_guard', name: '骷髏警衛', level: 27, hp: 270, ac: -15, exp: 730, atkSpeed: 2000, dice: '4d10', hitBonus: 5, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'steel_helmet', rate: 1}, {id:'broad_spear', rate: 5}] },
        { id: 'skeleton_marksman', name: '骷髏神射手', level: 27, hp: 250, ac: -15, exp: 730, atkSpeed: 2000, dice: '2d15+10', hitBonus: 9, isUndead: true, weight: 73, adena: [70,210], drops: [{id:'book_dex', rate: 0.5}, {id:'book_tame', rate: 0.3}] },
        { id: 'skeleton_fighter', name: '骷髏鬥士', level: 29, hp: 280, ac: -15, exp: 842, atkSpeed: 2000, dice: '3d10+10', hitBonus: 5, isUndead: true, weight: 71, adena: [70,210], drops: [{id:'ring', rate: 0.8}, {id:'book_dex', rate: 0.5}, {id:'book_haste', rate: 0.1}, {id:'battle_axe', rate: 2}, {id:'antic_cloak', rate: 1}, {id:'shield_large', rate: 3}] },
        { id: 'doro', name: '多羅', level: 28, hp: 270, ac: -15, exp: 785, atkSpeed: 2000, dice: '4d10', hitBonus: 5, weight: 72, adena: [135,225], drops: [{id:'battle_axe', rate: 2}, {id:'berserk_axe', rate: 1}, {id:'giant_axe', rate: 2}, {id:'helm_heal_magic', rate: 0.5}, {id:'helm_str_magic', rate: 0.2}, {id:'armor_rattan', rate: 3}, {id:'belt_doro', rate: 0.3}, {id:'book_high_heal', rate: 0.5}, {id:'book_zombie', rate: 0.1}, {id:'book_full_heal', rate: 0.1}] },
        { id: 'monia', name: '莫妮亞', level: 30, hp: 350, ac: -12, exp: 901, atkSpeed: 1000, dice: '2d10+7', hitBonus: 8, weight: 70, adena: [145,235], drops: [{id:'cloak_protector', rate: 5}, {id:'book_high_heal', rate: 0.5}, {id:'book_slow', rate: 0.5}] }
    ]},
    antaras_lair: { name: '安塔瑞斯棲息地', monsters: [
        { id: 'antaras', name: '安塔瑞斯', level: 90, hp: 180000, ac: -99, exp: 8101, atkSpeed: 2000, dice: '8d10+20', hitBonus: 45, isBoss: true, weight: 1, adena: [1305,2054], drops: [
            {id:'katana', rate: 3}, {id:'sword_tsurugi', rate: 1}, {id:'armor_crystal', rate: 3}, {id:'armor_metal', rate: 1}, {id:'gloves_normal', rate: 1}, 
            {id:'amulet_wis', rate: 0.1}, {id:'amulet_con', rate: 0.1}, {id:'ring_earth', rate: 0.01}, {id:'belt_body', rate: 0.01}, {id:'belt_soul', rate: 0.01}, {id:'belt_mind', rate: 0.01}, 
            {id:'book_weapon_break', rate: 0.4}, {id:'book_slow', rate: 0.5}, {id:'book_tame', rate: 0.3}, {id:'book_str_buff', rate: 0.1}, {id:'book_earth', rate: 0.1}, {id:'book_full_heal', rate: 0.1}, {id:'book_summon', rate: 0.02}, {id:'book_resurrect', rate: 5}
        ] }
    ]}
};
