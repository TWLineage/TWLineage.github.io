// 遊戲主循環與初始化生命週期 (v0.2.3)
window.game = window.game || {};

// Quickslot key binders (F5-F12)
window.game.triggerQuickslot = function(slotId) {
    if (slotId === 'f5') {
        let type = window.game.state.settings.autoHpType;
        let potKey = null;
        for(let k in window.game.state.inventory) { if(window.game.state.inventory[k].itemId === type) { potKey = k; break; } }
        if (potKey && window.game.state.inventory[potKey].count > 0) {
            window.game.usePotion(potKey);
        } else {
            window.game.logSystem(`快捷鍵 F5：身上沒有 ${window.ITEMS[type]?.name || '治癒藥水'}！`, 'danger');
        }
    } else if (slotId === 'f6') {
        let sId = window.game.state.settings.autoAttack;
        if (sId !== 'none' && window.SPELLS[sId]) {
            if (window.game.state.targetMonster) {
                window.game.playerMagicAttack();
            } else {
                window.game.logSystem(`快捷鍵 F6：沒有戰鬥目標！`, 'warn');
            }
        } else {
            window.game.logSystem(`快捷鍵 F6：目前無設定自動攻擊魔法！`, 'warn');
        }
    } else {
        window.game.logSystem(`快捷鍵 ${slotId.toUpperCase()} 目前無綁定功能。`, 'normal');
    }
};

window.game.init = function() {
    window.game.renderMapSelect();
    window.game.checkSaveFile();
    window.game.switchForumTab('all');
    window.game.makeWindowsDraggable();
    
    // Quickslots (F5-F12) Key Listeners
    window.addEventListener('keydown', (e) => {
        if (['F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
            e.preventDefault();
            const slotId = e.key.toLowerCase();
            window.game.triggerQuickslot(slotId);
        }
    });
};

window.game.renderMapSelect = function() {
    const select = document.getElementById('win-map-select');
    let keys = Object.keys(window.MAPS).filter(k => k !== 'antaras_lair');
    keys.sort((a, b) => window.MAPS[a].name.localeCompare(window.MAPS[b].name, 'zh-TW'));
    select.innerHTML = '';
    
    const getMapLevelDesc = (mapId) => {
        let map = window.MAPS[mapId];
        if (!map || !map.monsters || map.monsters.length === 0) return '';
        let levels = map.monsters.map(m => m.level);
        let minLvl = Math.min(...levels);
        let maxLvl = Math.max(...levels);
        if (minLvl === maxLvl) return ` (Lv.${minLvl})`;
        return ` (Lv.${minLvl}~${maxLvl})`;
    };

    keys.forEach(k => { 
        select.innerHTML += `<option value="${k}">${window.MAPS[k].name}${getMapLevelDesc(k)}</option>`; 
    });
    select.innerHTML += `<option value="antaras_lair" class="text-yellow-500 font-bold">${window.MAPS['antaras_lair'].name}${getMapLevelDesc('antaras_lair')}</option>`;
    select.value = window.game.state.currentMap;
};

window.game.checkSaveFile = function() {
    document.getElementById('btn-load-game').style.display = localStorage.getItem('lineageIdleSave') ? 'block' : 'none';
};

window.game.showCreation = function() {
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('creation-menu').classList.remove('hidden');
    window.game.updateCreateUI();
};

window.game.showStartMenu = function() {
    document.getElementById('creation-menu').classList.add('hidden');
    document.getElementById('start-menu').classList.remove('hidden');
};

window.game.saveGame = function() {
    const saveData = {
        level: window.game.state.level, exp: window.game.state.exp, adena: window.game.state.adena,
        hp: window.game.state.hp, maxHp: window.game.state.maxHp, mp: window.game.state.mp, maxMp: window.game.state.maxMp,
        baseStats: window.game.state.baseStats, bonusPoints: window.game.state.bonusPoints,
        inventory: window.game.state.inventory, equipment: window.game.state.equipment, spells: window.game.state.spells,
        settings: window.game.state.settings, currentMap: window.game.state.currentMap, antarasDeadUntil: window.game.state.antarasDeadUntil
    };
    localStorage.setItem('lineageIdleSave', JSON.stringify(saveData));
    window.game.logSystem('遊戲進度已儲存。', 'reward');
};

window.game.loadGame = function() {
    const savedDataStr = localStorage.getItem('lineageIdleSave');
    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            let migratedInv = {};
            if (savedData.inventory) {
                for (let oldKey in savedData.inventory) {
                    let item = savedData.inventory[oldKey];
                    if (!item || !item.itemId) continue;
                    if (item.itemId === 'book_dex_buff') item.itemId = 'book_dex';
                    if (item.itemId === 'book_create_zombie') item.itemId = 'book_zombie';
                    if (!window.ITEMS[item.itemId]) continue;
                    let enchant = parseInt(item.enchant) || 0;
                    let isBlessed = !!item.isBlessed;
                    let newKey = window.game.getItemKey(item.itemId, enchant, isBlessed);
                    migratedInv[newKey] = { itemId: item.itemId, enchant: enchant, count: item.count, isBlessed: isBlessed };
                }
            }

            let defaultEq = { weapon: null, shield: null, helmet: null, tshirt: null, armor: null, leggings: null, boots: null, cloak: null, gloves: null, amulet: null, earring1: null, earring2: null, ring1: null, ring2: null, belt: null };
            let equipmentMap = { ...defaultEq };
            
            if (savedData.equipment) {
                for (let slot in savedData.equipment) {
                    let eqKey = savedData.equipment[slot];
                    if (!eqKey) continue;
                    
                    let targetSlot = slot;
                    if (slot === 'ring') targetSlot = 'ring1';
                    if (slot === 'earring') targetSlot = 'earring1';
                    
                    if (migratedInv[eqKey]) equipmentMap[targetSlot] = eqKey;
                    else if (migratedInv[eqKey + '_false']) equipmentMap[targetSlot] = eqKey + '_false';
                    else if (migratedInv[eqKey + '_true']) equipmentMap[targetSlot] = eqKey + '_true';
                }
            }

            window.game.state.inventory = migratedInv;
            window.game.state.equipment = equipmentMap;
            window.game.state.level = parseInt(savedData.level) || 1;
            window.game.state.exp = parseInt(savedData.exp) || 0;
            window.game.state.adena = parseInt(savedData.adena) || 0;
            window.game.state.baseStats = savedData.baseStats || { str: 8, dex: 8, con: 8, int: 8, wis: 8 };
            window.game.state.createPoints = parseInt(savedData.createPoints) || 0;
            window.game.state.bonusPoints = parseInt(savedData.bonusPoints) || 0;
            window.game.state.spells = Array.isArray(savedData.spells) ? savedData.spells.filter(id => window.SPELLS[id]) : [];
            window.game.state.currentMap = savedData.currentMap || 'knight_village';
            window.game.state.antarasDeadUntil = savedData.antarasDeadUntil || 0;
            
            window.game.state.settings = { ...window.game.state.settings, ...(savedData.settings || {}) };
            window.game.state.settings.autoHpThreshold = parseInt(window.game.state.settings.autoHpThreshold) || 5;
            window.game.state.settings.autoHealThreshold = parseInt(window.game.state.settings.autoHealThreshold) || 50;
            window.game.state.settings.autoAttackMpThreshold = parseInt(window.game.state.settings.autoAttackMpThreshold) || 0;
            if(!window.game.state.settings.autoHealSpell) window.game.state.settings.autoHealSpell = 'none';

            window.game.state.buffs = {}; 
            window.game.state.targetMonster = null;
            window.game.state.zombieTick = 0;
            window.game.state.monsterSpecialTick = 0;
            
            document.getElementById('char-creation-modal').style.display = 'none';
            document.getElementById('main-ui').classList.remove('hidden');
            
            window.game.calculateMaxHpMp();
            window.game.state.hp = parseInt(savedData.hp) || window.game.state.maxHp;
            window.game.state.mp = parseInt(savedData.mp) || window.game.state.maxMp;
            
            window.game.updateUI();
            window.game.renderInventory();
            window.game.renderSkills();
            window.game.updateSettingsUI();
            
            document.getElementById('win-cfg-hp-threshold').value = window.game.state.settings.autoHpThreshold;
            document.getElementById('win-cfg-hp-type').value = window.game.state.settings.autoHpType || 'potion_red';
            document.getElementById('win-cfg-auto-buy').checked = !!window.game.state.settings.autoBuyHp;
            document.getElementById('win-cfg-auto-mp').checked = !!window.game.state.settings.autoBuyMp;
            document.getElementById('win-cfg-auto-wis').checked = !!window.game.state.settings.autoBuyWis;
            document.getElementById('win-cfg-auto-attack-mp').value = window.game.state.settings.autoAttackMpThreshold;
            document.getElementById('win-cfg-heal-threshold').value = window.game.state.settings.autoHealThreshold;
            
            let mapSel = document.getElementById('win-map-select');
            if (Array.from(mapSel.options).some(o => o.value === window.game.state.currentMap)) mapSel.value = window.game.state.currentMap;
            else { window.game.state.currentMap = 'knight_village'; mapSel.value = 'knight_village'; }
            
            window.game.logSystem('讀取存檔成功！歡迎回來。', 'reward');
            window.game.startLoops();
            window.game.startBattle();
        } catch (e) {
            console.error("Load failed", e);
            alert("讀取存檔失敗。為保護遊戲進度系統已攔截崩潰，若持續異常請考慮刪除舊存檔。");
        }
    }
};

window.game.deleteSave = function() {
    localStorage.removeItem('lineageIdleSave');
    window.game.logSystem('存檔已刪除。', 'danger');
};

window.game.adjustStat = function(stat, amount) {
    if(amount > 0 && window.game.state.createPoints > 0 && window.game.state.baseStats[stat] < 18) { window.game.state.baseStats[stat]++; window.game.state.createPoints--; } 
    else if(amount < 0 && window.game.state.baseStats[stat] > 8) { window.game.state.baseStats[stat]--; window.game.state.createPoints++; }
    window.game.updateCreateUI();
};

window.game.updateCreateUI = function() {
    ['str','dex','con','int','wis'].forEach(s => document.getElementById(`create-${s}`).innerText = window.game.state.baseStats[s]);
    document.getElementById('create-points').innerText = window.game.state.createPoints;
    document.getElementById('btn-start').disabled = window.game.state.createPoints > 0;
};

window.game.startGame = function() {
    document.getElementById('char-creation-modal').style.display = 'none';
    document.getElementById('main-ui').classList.remove('hidden');
    window.game.addInventory('dagger_orc', 1, 0, false);
    window.game.addInventory('potion_red', 50, 0, false);
    window.game.calculateMaxHpMp();
    window.game.state.hp = window.game.state.maxHp;
    window.game.state.mp = window.game.state.maxMp;
    window.game.updateUI();
    window.game.renderInventory();
    window.game.renderSkills();
    window.game.logSystem('歡迎來到天堂放置版。你的冒險開始了！', 'reward');
    window.game.startLoops();
    window.game.startBattle();
};

window.game.escapeToTown = function() {
    window.game.changeMap('knight_village');
    if (!document.getElementById('win-map').classList.contains('hidden')) {
        window.game.toggleWindow('win-map');
    }
};

window.game.toggleAutoCombatArena = function() {
    const btn = document.getElementById('btn-auto-toggle-arena');
    if (window.game.state.isPlaying) {
        window.game.stopBattle();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play mr-1"></i>開始自動';
            btn.className = "btn-ui !py-2.5 text-xs font-bold w-full bg-red-950/60 border-red-800 text-red-200 hover:border-red-500";
        }
        window.game.logSystem('停止自動戰鬥。');
    } else {
        window.game.startBattle();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause mr-1"></i>停止自動';
            btn.className = "btn-ui !py-2.5 text-xs font-bold w-full bg-red-800 border-red-500 text-white hover:bg-red-900";
        }
        window.game.logSystem('開始自動戰鬥！');
    }
};

window.game.playerAttack = function() {
    if(!window.game.state.targetMonster || window.game.state.hp <= 0 || (window.game.state.buffs.petrified > 0) || (window.game.state.buffs.stun > 0)) return;
    
    let dmg = 0, isHit = false;
    let wKey = window.game.state.equipment.weapon;
    let wpn = null, wDef = null;
    if(wKey && window.game.state.inventory[wKey]) { wpn = window.game.state.inventory[wKey]; wDef = window.ITEMS[wpn.itemId]; }
    
    let dbf = window.game.state.targetMonster.debuffs || {};
    let tAc = window.game.state.targetMonster.ac + (dbf.disease > 0 ? 8 : 0);
    let roll = window.rollDice('1d20');
    let isCrit = false;
    
    if(roll === 1) isHit = false;
    else if(roll === 20) { isHit = true; isCrit = true; }
    else if(roll + window.game.getMeleeHit() + (window.game.state.level - window.game.state.targetMonster.level) >= 10 - tAc) isHit = true;
    
    if(isHit) {
        let dice = wDef && wDef.dice ? wDef.dice : '1d2';
        let dDmg = isCrit ? parseInt(dice.split('d')[1]) : window.rollDice(dice);
        let bonusUndead = 0;
        if (wDef && wDef.isUndeadSlayer && (window.game.state.targetMonster.isUndead || window.game.state.targetMonster.isWerewolf)) {
            bonusUndead = Math.floor(Math.random() * 4) + 3; 
        }
        dmg = Math.max(1, dDmg + window.game.getMeleeDmg() + bonusUndead);
        window.game.logCombat(`你命中了 ${window.game.state.targetMonster.name} 造成 ${dmg} 點傷害${isCrit?' (爆擊！)':''}${bonusUndead > 0 ? ` (弱點加成 +${bonusUndead})` : ''}。`, 'hit');
        
        if (wpn && wpn.itemId === 'staff_mana') {
            window.game.state.mp = Math.min(window.game.state.maxMp, window.game.state.mp + 1);
            window.game.logCombat(`瑪那魔杖吸收了 1 點魔力。`);
            window.game.updateUI();
        }
        
        if (wpn && wpn.itemId === 'hammer_thor' && Math.random() * 100 < (5 + Number(wpn.enchant))) {
            let sp = window.SPELLS['call_lightning'];
            let finalDmg = window.game.calcMagicDmgToMonster(window.rollDice(sp.dice) + (sp.baseDmg||0) + window.game.getMagicDmg());
            window.game.logCombat(`雷神之槌發動了 極道落雷，造成 ${finalDmg} 點傷害。`, 'magic');
            window.game.state.targetMonster.hp -= finalDmg;
        }
        
        if (wpn && wpn.itemId === 'sword_dk_fire' && Math.random() < 0.15) {
            let sp = window.SPELLS['fire_arrow'];
            let finalDmg = window.game.calcMagicDmgToMonster(window.rollDice(sp.dice) + (sp.baseDmg||0) + window.game.getMagicDmg());
            window.game.logCombat(`死亡騎士的烈炎之劍發動了 烈炎術，造成 ${finalDmg} 點傷害。`, 'magic');
            window.game.state.targetMonster.hp -= finalDmg;
        }
    } else window.game.logCombat(`你的攻擊未命中 ${window.game.state.targetMonster.name}。`);

    if(isHit) {
        window.game.state.targetMonster.hp -= dmg;
        window.game.updateMonsterHpBar();
        if(window.game.state.targetMonster.hp <= 0) window.game.monsterDied();
    }
};

window.game.playerMagicAttack = function() {
    if(!window.game.state.targetMonster || window.game.state.hp <= 0 || (window.game.state.buffs.petrified > 0) || (window.game.state.buffs.stun > 0)) return;
    
    let sId = window.game.state.settings.autoAttack;
    if (sId === 'none' || !window.SPELLS[sId] || !window.game.getAvailableSpells().includes(sId)) return;
    let spell = window.SPELLS[sId];
    if(!window.canCastSpell(spell.level, window.game.state.level)) return;
    
    let dbf = window.game.state.targetMonster.debuffs || {};
    if (spell.id === 'darkness' && dbf.darkness > 0) return;
    if (spell.id === 'disease' && dbf.disease > 0) return;
    if (spell.id === 'weapon_break' && dbf.weapon_break > 0) return;
    if (spell.id === 'slow' && dbf.slow > 0) return;
    if (window.game.state.mp < window.game.state.settings.autoAttackMpThreshold) return;
    
    let cost = window.game.getSpellCost(spell);
    if(window.game.state.mp < cost) return;
    
    window.game.state.mp -= cost;
    window.game.updateUI();
    
    if (spell.id === 'slow') {
        if (!window.game.state.targetMonster.debuffs) window.game.state.targetMonster.debuffs = {};
        window.game.state.targetMonster.debuffs.slow = spell.duration; 
        window.game.logCombat(`施放了 ${spell.name}，${window.game.state.targetMonster.isBoss ? '但對頭目無效' : `${window.game.state.targetMonster.name} 動作變慢了`}。`, 'magic');
        return;
    }

    if (spell.id === 'sleep_mist') {
        let secs = window.rollDice('1d8');
        if (!window.game.state.targetMonster.debuffs) window.game.state.targetMonster.debuffs = {};
        window.game.state.targetMonster.debuffs.sleep = secs;
        window.game.logCombat(`施放了 ${spell.name}，${window.game.state.targetMonster.name} 陷入沉睡 ${secs} 秒。`, 'magic');
        return;
    }
    
    if (spell.id === 'darkness') {
        if (!window.game.state.targetMonster.debuffs) window.game.state.targetMonster.debuffs = {};
        window.game.state.targetMonster.debuffs.darkness = spell.duration;
        window.game.logCombat(`施放了 ${spell.name}，${window.game.state.targetMonster.name} 被黑闇籠罩(命中-5)。`, 'magic');
        return;
    }

    if (spell.id === 'disease') {
        if (!window.game.state.targetMonster.debuffs) window.game.state.targetMonster.debuffs = {};
        window.game.state.targetMonster.debuffs.disease = spell.duration;
        window.game.logCombat(`施放了 ${spell.name}，${window.game.state.targetMonster.name} 感染了疾病(命中-4, AC+8)。`, 'magic');
        return;
    }

    if (spell.id === 'weapon_break') {
        if (!window.game.state.targetMonster.debuffs) window.game.state.targetMonster.debuffs = {};
        window.game.state.targetMonster.debuffs.weapon_break = spell.duration;
        window.game.logCombat(`施放了 ${spell.name}，${window.game.state.targetMonster.name} 武器受損(傷害-10)。`, 'magic');
        return;
    }

    if (spell.dice) {
        let totalDmg = 0;
        let mDmg = window.game.getMagicDmg();
        let hits = 1;
        let diceExp = spell.dice;
        let baseDmg = spell.baseDmg || 0;
        let lastHitBonus = 0;
        
        if (spell.id === 'fireball') { hits = 3; diceExp = '1d16'; baseDmg = 0; lastHitBonus = mDmg; }
        else if (spell.id === 'lightning_storm') { hits = 9; diceExp = '1d18'; baseDmg = 0; lastHitBonus = mDmg; }
        else if (spell.id === 'blizzard') { hits = 11; diceExp = '1d10'; baseDmg = 0; lastHitBonus = mDmg; }
        else if (spell.id === 'fire_storm') { hits = 4; diceExp = '3d10'; baseDmg = 0; lastHitBonus = mDmg; }
        else if (spell.id === 'tornado') { hits = 5; diceExp = '1d20'; baseDmg = 0; lastHitBonus = 5 + mDmg; }
        else if (spell.id === 'earth_prison') { hits = 2; diceExp = '2d8'; baseDmg = 0; lastHitBonus = 0; }
        else if (spell.id === 'quake') { hits = 4; diceExp = '3d6'; baseDmg = 0; lastHitBonus = mDmg; }
        else { lastHitBonus = mDmg; }

        for(let i=0; i<hits; i++) {
            let d = 0;
            if (spell.id === 'earth_prison') {
                d = i === 0 ? window.rollDice('2d8') : window.rollDice('2d10') + mDmg;
            } else if (['blizzard', 'fire_storm', 'quake'].includes(spell.id)) {
                 d = window.rollDice(diceExp) + baseDmg + mDmg;
            } else {
                 d = window.rollDice(diceExp) + baseDmg;
                 if (i === hits - 1) d += lastHitBonus;
            }
            
            let finalDmg = window.game.calcMagicDmgToMonster(d);
            totalDmg += finalDmg;
            window.game.logCombat(`施放了 ${spell.name}，造成 ${finalDmg} 點傷害。`, 'magic');
        }
        
        if(spell.healDice) {
            let h = window.rollDice(spell.healDice);
            if (window.game.state.buffs.heal_erosion) h = Math.floor(h / 2);
            window.game.state.hp = Math.min(window.game.state.maxHp, window.game.state.hp + h);
            window.game.updateUI();
        }
        
        window.game.state.targetMonster.hp -= totalDmg;
        window.game.updateMonsterHpBar();
        if(window.game.state.targetMonster.hp <= 0) window.game.monsterDied();
    }
};

window.game.startLoops = function() {
    window.game.state.regenLoop = setInterval(() => {
        if(window.game.state.hp > 0 && window.game.state.hp < window.game.state.maxHp && !window.game.state.buffs.berserkers) {
            let con = window.game.getEffStat('con');
            let h = con<=13?1:con-12;
            if (window.game.state.buffs.heal_erosion) h = Math.floor(h / 2);
            window.game.state.hp = Math.min(window.game.state.maxHp, window.game.state.hp + h);
        }
        if(window.game.state.mp < window.game.state.maxMp) {
            let wis = window.game.getEffStat('wis');
            let r = wis<=14?1:wis<=16?2:wis===17?3:4;
            if(window.game.state.buffs.potion_blue) r += (wis<=11?1:1+(wis-10));
            if(window.game.state.buffs.potion_wisdom) r += 2;
            
            let robeKey = window.game.state.equipment.armor;
            if(robeKey && window.game.state.inventory[robeKey]) {
                let robeId = window.game.state.inventory[robeKey].itemId;
                if (robeId === 'robe_black_elder') r += 20;
            }
            let shoesKey = window.game.state.equipment.boots;
            if(shoesKey && window.game.state.inventory[shoesKey]) {
                let shoesId = window.game.state.inventory[shoesKey].itemId;
                if (shoesId === 'sandals_black_elder') r += 10;
            }
            
            window.game.state.mp = Math.min(window.game.state.maxMp, window.game.state.mp + r);
        }
        window.game.updateUI();
    }, 16000); 
    
    window.game.state.tickLoop = setInterval(() => {
        if(!window.game.state.isPlaying || window.game.state.hp <= 0) return;
        
        let needUpdate = false;
        let availSpells = window.game.getAvailableSpells();
        
        if (window.game.state.buffs.petrified > 0 || window.game.state.buffs.heal_erosion > 0 || window.game.state.buffs.poison_storm > 0 || window.game.state.buffs.player_weapon_break > 0 || window.game.state.buffs.stun > 0) {
            if (window.game.state.settings.autoBuffs.includes('cancel') && window.game.state.mp >= 40) {
                window.game.state.mp -= 40;
                window.game.state.buffs.petrified = 0;
                window.game.state.buffs.heal_erosion = 0;
                window.game.state.buffs.poison_storm = 0;
                window.game.state.buffs.player_weapon_break = 0;
                window.game.state.buffs.stun = 0;
                window.game.logCombat(`自動發動了 魔法相消術，消除了所有異常狀態！`, 'magic');
                needUpdate = true;
            }
        }
        
        for(let key in window.game.state.buffs) {
            if(window.game.state.buffs[key] > 0) {
                window.game.state.buffs[key]--;
                if(window.game.state.buffs[key] <= 0) { 
                    delete window.game.state.buffs[key]; 
                    needUpdate = true; 
                    let bName = window.SPELLS[key] ? window.SPELLS[key].name : key;
                    if (key === 'potion_blue') bName = '魔力藥水';
                    if (key === 'potion_wisdom') bName = '慎重藥水';
                    if (key === 'player_weapon_break') bName = '武器受損';
                    if (key === 'poison_storm') bName = '毒氣風暴';
                    if (key === 'petrified') bName = '石化';
                    if (key === 'heal_erosion') bName = '治癒侵蝕';
                    if (key === 'stun') bName = '衝暈';
                    window.game.logSystem(`${bName} 狀態消失。`);
                }
            }
        }

        if(window.game.state.targetMonster && !(window.game.state.buffs.petrified > 0)) {
            if (window.game.state.targetMonster.debuffs) {
                for(let k in window.game.state.targetMonster.debuffs) {
                    if(window.game.state.targetMonster.debuffs[k] > 0) {
                        window.game.state.targetMonster.debuffs[k]--;
                        if(window.game.state.targetMonster.debuffs[k] <= 0) {
                            if (k === 'slow') window.game.logCombat(`${window.game.state.targetMonster.name} 的緩速狀態結束了。`);
                            if (k === 'sleep') window.game.logCombat(`${window.game.state.targetMonster.name} 醒來了！`);
                            if (k === 'darkness') window.game.logCombat(`${window.game.state.targetMonster.name} 恢復了視力。`);
                            if (k === 'disease') window.game.logCombat(`${window.game.state.targetMonster.name} 從疾病中恢復。`);
                        }
                    }
                }
            }
            
            window.game.state.monsterSpecialTick++;
            let st = window.game.state.monsterSpecialTick;
            let tm = window.game.state.targetMonster;
            let tmId = tm.id;
            
            if (st % 5 === 0 && !(tm.debuffs?.sleep > 0) && tmId === 'hellhound') {
                window.game.logCombat(`地獄犬發動噴火，造成 ${window.game.takeMagicDmg(window.rollDice('3d8'))} 點魔法傷害！`, 'danger');
                needUpdate = true; window.game.checkPlayerDeath();
            }
            
            if (tmId === 'black_elder' && !(tm.debuffs?.sleep > 0)) {
                if (st % 8 === 0) {
                    window.game.logCombat(`黑長者發動極道落雷，造成 ${window.game.takeMagicDmg(window.rollDice('5d16')+40)} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 15 === 0) {
                    for(let i=0; i<8; i++) window.game.logCombat(`黑長者施展龍捲風，造成 ${window.game.takeMagicDmg(window.rollDice('1d20')+5)} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 30 === 0 && tm.hp < tm.maxHp * 0.5 && Math.random() * 100 < (90 - window.game.getMR())) {
                    window.game.state.buffs.heal_erosion = 15;
                    window.game.logCombat(`黑長者施展了治癒侵蝕術，你的恢復量減半！`, 'danger');
                    needUpdate = true;
                }
            }

            if (st % 10 === 0 && !(tm.debuffs?.sleep > 0) && tmId === 'arian') {
                if (Math.random() * 100 < (50 - window.game.getMR())) {
                    window.game.state.buffs.petrified = 4;
                    window.game.logCombat(`亞力安施展了石化攻擊，你陷入了石化！`, 'danger');
                    needUpdate = true;
                }
            }
            
            if (tmId === 'wyrm' && !(tm.debuffs?.sleep > 0)) {
                if (st % 12 === 0) {
                    window.game.logCombat(`飛龍發動火焰噴吐，造成 ${window.game.takeMagicDmg(window.rollDice('6d20')+40)} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 17 === 0 && tm.hp < tm.maxHp * 0.5) {
                    for(let i=0; i<8; i++) {
                        let base = window.rollDice('1d20') + 3;
                        if (i < 2) base += window.rollDice('1d20') + 3; 
                        window.game.logCombat(`飛龍施展流星雨，造成 ${window.game.takeMagicDmg(base)} 點魔法傷害！`, 'danger');
                    }
                    needUpdate = true; window.game.checkPlayerDeath();
                }
            }
            
            if (tmId === 'antaras' && !(tm.debuffs?.sleep > 0)) {
                if (st % 8 === 0) {
                    window.game.logCombat(`安塔瑞斯施展地裂術，造成 ${window.game.takeMagicDmg(window.rollDice('5d20'))} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 30 === 0) {
                    window.game.state.buffs.poison_storm = 15;
                    window.game.logCombat(`安塔瑞斯施展了毒氣風暴！`, 'danger');
                    needUpdate = true;
                }
                if (st % 40 === 0) {
                    window.game.state.buffs.player_weapon_break = 20;
                    window.game.logCombat(`安塔瑞斯施展了壞物術，你的武器傷害降低了！`, 'danger');
                    needUpdate = true;
                }
                if (st % 12 === 0 && tm.hp < tm.maxHp * 0.5) {
                    window.game.logCombat(`安塔瑞斯發動大地怒吼，造成 ${window.game.takeMagicDmg(window.rollDice('10d20'))} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
            }

            if (tmId === 'death_knight' && !(tm.debuffs?.sleep > 0)) {
                if (st % 7 === 0) {
                    window.game.logCombat(`死亡騎士施展光球，造成 ${window.game.takeMagicDmg(window.rollDice('3d30')+30)} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 18 === 0) {
                    window.game.logCombat(`死亡騎士施展地面震裂，造成 ${window.game.takeMagicDmg(window.rollDice('10d20')+50)} 點魔法傷害！`, 'danger');
                    needUpdate = true; window.game.checkPlayerDeath();
                }
                if (st % 15 === 0 && tm.hp < tm.maxHp * 0.5 && Math.random() < 0.30) {
                    window.game.state.buffs.stun = 4;
                    window.game.logCombat(`死亡騎士發動衝暈，你陷入了昏迷！`, 'danger');
                    needUpdate = true;
                }
            }
        }
        
        if (window.game.state.buffs.poison_storm > 0 && window.game.state.buffs.poison_storm % 3 === 0) {
            window.game.logCombat(`你受到毒氣風暴的侵蝕，損失了 ${window.game.takeMagicDmg(100)} 點體力。`, 'danger');
            needUpdate = true; window.game.checkPlayerDeath();
        }
        
        if (!(window.game.state.buffs.petrified > 0) && !(window.game.state.buffs.stun > 0)) {
            if (window.game.state.targetMonster && window.game.state.buffs.create_zombie > 0) {
                window.game.state.zombieTick++;
                if (window.game.state.zombieTick >= 2) {
                    window.game.state.zombieTick = 0;
                    let roll = window.rollDice('1d20');
                    let isHit = false;
                    if(roll === 20) isHit = true;
                    else if(roll !== 1 && roll + (window.game.state.level - window.game.state.targetMonster.level) >= 10 - window.game.state.targetMonster.ac) isHit = true;

                    if (isHit) {
                        let dmg = window.rollDice('2d4');
                        window.game.state.targetMonster.hp -= dmg;
                        window.game.logCombat(`隨從(人形殭屍) 命中了 ${window.game.state.targetMonster.name} 造成 ${dmg} 點傷害。`, 'success');
                        window.game.updateMonsterHpBar();
                        if(window.game.state.targetMonster.hp <= 0) window.game.monsterDied();
                    } else window.game.logCombat(`隨從(人形殭屍) 的攻擊未命中 ${window.game.state.targetMonster.name}。`);
                }
            }

            if (window.game.state.targetMonster && window.game.state.buffs.summon_ogre > 0) {
                if (window.game.state.zombieTick === 0) { 
                    let roll = window.rollDice('1d20');
                    let isHit = false;
                    if(roll === 20) isHit = true;
                    else if(roll !== 1 && roll + (window.game.state.level - window.game.state.targetMonster.level) >= 10 - window.game.state.targetMonster.ac) isHit = true;

                    if (isHit) {
                        let dmg = window.rollDice('2d8') * 4;
                        window.game.state.targetMonster.hp -= dmg;
                        window.game.logCombat(`召喚的食人妖精 連續猛擊了 ${window.game.state.targetMonster.name} 造成 ${dmg} 點傷害。`, 'success');
                        window.game.updateMonsterHpBar();
                        if(window.game.state.targetMonster.hp <= 0) window.game.monsterDied();
                    }
                }
            }

            for(let sId of window.game.state.settings.autoBuffs) {
                let sp = window.SPELLS[sId];
                if(availSpells.includes(sId) && window.canCastSpell(sp.level, window.game.state.level)) {
                    let shouldCast = (!window.game.state.buffs[sId] || window.game.state.buffs[sId] <= 0);

                    if (shouldCast && sId !== 'cancel') { 
                        let cost = window.game.getSpellCost(sp);
                        if(window.game.state.mp >= cost) {
                            window.game.state.mp -= cost;
                            if(sp.healBase) {
                                let h = sp.healBase + window.game.getMagicDmg();
                                if (window.game.state.buffs.heal_erosion) h = Math.floor(h / 2);
                                window.game.state.hp = Math.min(window.game.state.maxHp, window.game.state.hp + h);
                            } else window.game.state.buffs[sId] = sp.duration;
                            window.game.logCombat(`自動施放了 ${sp.name}。`, 'info');
                            needUpdate = true;
                        }
                    }
                } else if (!availSpells.includes(sId)) {
                    window.game.state.settings.autoBuffs = window.game.state.settings.autoBuffs.filter(bid => bid !== sId);
                }
            }
            
            if (window.game.state.autoHealCd > 0) window.game.state.autoHealCd--;
            if (window.game.state.autoHealCd <= 0 && window.game.state.hp <= window.game.state.settings.autoHealThreshold) {
                let hId = window.game.state.settings.autoHealSpell;
                if (hId && hId !== 'none' && availSpells.includes(hId)) {
                    let sp = window.SPELLS[hId];
                    if (window.canCastSpell(sp.level, window.game.state.level)) {
                        let cost = window.game.getSpellCost(sp);
                        if(window.game.state.mp >= cost) {
                            window.game.state.mp -= cost;
                            let h = sp.healBase + window.game.getMagicDmg();
                            if (window.game.state.buffs.heal_erosion) h = Math.floor(h / 2);
                            window.game.state.hp = Math.min(window.game.state.maxHp, window.game.state.hp + h);
                            window.game.logCombat(`自動施放了 ${sp.name}。`, 'info');
                            window.game.state.autoHealCd = 3;
                            needUpdate = true;
                        }
                    }
                }
            }
            
            if(window.game.state.potionCooldown > 0) window.game.state.potionCooldown--;
            if(window.game.state.potionCooldown <= 0 && window.game.state.hp < window.game.state.maxHp && window.game.state.hp <= window.game.state.settings.autoHpThreshold) {
                let type = window.game.state.settings.autoHpType;
                let potKey = null;
                for(let k in window.game.state.inventory) { if(window.game.state.inventory[k].itemId === type) { potKey = k; break; } }
                if(!potKey && window.game.state.settings.autoBuyHp && window.game.state.adena >= window.ITEMS[type].price * 100) {
                    window.game.state.adena -= window.ITEMS[type].price * 100;
                    window.game.addInventory(type, 100, 0, false);
                    potKey = Object.keys(window.game.state.inventory).find(k => window.game.state.inventory[k].itemId === type);
                    window.game.logSystem(`自動購買了 100 瓶 ${window.ITEMS[type].name}。`);
                }
                if(potKey && window.game.state.inventory[potKey].count > 0) { window.game.usePotion(potKey); window.game.state.potionCooldown = 1; }
            }
            
            if (window.game.state.settings.autoBuyMp && (!window.game.state.buffs.potion_blue || window.game.state.buffs.potion_blue <= 0)) {
                let mpPotKey = Object.keys(window.game.state.inventory).find(k => window.game.state.inventory[k].itemId === 'potion_blue');
                if (!mpPotKey || window.game.state.inventory[mpPotKey].count <= 0) {
                    if (window.game.state.adena >= 1046) {
                        window.game.state.adena -= 1046;
                        window.game.addInventory('potion_blue', 1, 0, false);
                        mpPotKey = Object.keys(window.game.state.inventory).find(k => window.game.state.inventory[k].itemId === 'potion_blue');
                        window.game.logSystem(`自動購買了 1 瓶 藍色藥水。`);
                    }
                }
                if (mpPotKey && window.game.state.inventory[mpPotKey].count > 0) {
                    window.game.usePotion(mpPotKey);
                }
            }

            if (window.game.state.settings.autoBuyWis && (!window.game.state.buffs.potion_wisdom || window.game.state.buffs.potion_wisdom <= 0)) {
                let wisPotKey = Object.keys(window.game.state.inventory).find(k => window.game.state.inventory[k].itemId === 'potion_wisdom');
                if (!wisPotKey || window.game.state.inventory[wisPotKey].count <= 0) {
                    if (window.game.state.adena >= 750) {
                        window.game.state.adena -= 750;
                        window.game.addInventory('potion_wisdom', 1, 0, false);
                        wisPotKey = Object.keys(window.game.state.inventory).find(k => window.game.state.inventory[k].itemId === 'potion_wisdom');
                        window.game.logSystem(`自動購買了 1 瓶 慎重藥水。`);
                    }
                }
                if (wisPotKey && window.game.state.inventory[wisPotKey].count > 0) {
                    window.game.usePotion(wisPotKey);
                }
            }
        }

        if(needUpdate) window.game.updateUI();
        
    }, 1000);
};

window.game.startBattle = function() {
    window.game.state.isPlaying = true;
    if(!window.game.state.targetMonster) window.game.spawnMonster();
    
    const playerLoopFn = () => {
        if(!window.game.state.isPlaying || window.game.state.hp <= 0) return;
        if(window.game.state.targetMonster && !(window.game.state.buffs.petrified > 0) && !(window.game.state.buffs.stun > 0)) window.game.playerAttack();
        
        let wKey = window.game.state.equipment.weapon;
        let speed = (wKey && window.game.state.inventory[wKey]) ? (window.ITEMS[window.game.state.inventory[wKey].itemId]?.speed || 1200) : 1200;
        
        let reduction = 0;
        if (window.game.state.buffs.haste) reduction += 0.2;
        if (window.game.state.buffs.greater_haste) reduction += 0.3;
        speed = speed * (1 - reduction);
        
        window.game.state.battleLoop = setTimeout(playerLoopFn, speed);
    };

    const magicLoopFn = () => {
        if(!window.game.state.isPlaying || window.game.state.hp <= 0) return;
        if(window.game.state.targetMonster && !(window.game.state.buffs.petrified > 0) && !(window.game.state.buffs.stun > 0)) window.game.playerMagicAttack();
        window.game.state.magicLoop = setTimeout(magicLoopFn, 3000);
    };

    const monsterLoopFn = () => {
        if(!window.game.state.isPlaying || window.game.state.hp <= 0) return;
        if(window.game.state.targetMonster) {
            if (window.game.state.targetMonster.debuffs?.sleep > 0) {
                window.game.state.monsterLoop = setTimeout(monsterLoopFn, 1000);
                return;
            }
            window.game.monsterAttack();
        }
        let speed = window.game.state.targetMonster ? window.game.state.targetMonster.atkSpeed : 2000;
        if (window.game.state.targetMonster?.debuffs?.slow > 0 && !window.game.state.targetMonster.isBoss) speed += 1000;
        window.game.state.monsterLoop = setTimeout(monsterLoopFn, speed);
    };
    
    window.game.state.battleLoop = setTimeout(playerLoopFn, 1000);
    window.game.state.magicLoop = setTimeout(magicLoopFn, 3000);
    window.game.state.monsterLoop = setTimeout(monsterLoopFn, 2000);
};

window.game.stopBattle = function() {
    window.game.state.isPlaying = false;
    clearTimeout(window.game.state.battleLoop);
    clearTimeout(window.game.state.magicLoop);
    clearTimeout(window.game.state.monsterLoop);
};

window.onload = () => {
    window.game.init();
};
