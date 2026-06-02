// 玩家角色屬性與動作管理 (v0.2.3)
window.EXP_TABLE = [0];
const earlyExp = [125, 175, 200, 250, 546, 1105, 1695, 2465, 3439, 4641, 6095, 7825, 9855, 12209, 14911, 17985, 21455, 25345, 29679, 34481];
window.EXP_TABLE.push(...earlyExp);
const midExp = {21: 40000, 22: 45585, 23: 51935, 24: 58849, 25: 66351, 26: 74465, 27: 83215, 28: 92625, 29: 102719, 30: 113521, 31: 125055, 32: 137345, 33: 150415, 34: 164289, 35: 178991, 36: 194545, 37: 210975, 38: 228305, 39: 246559, 40: 265761, 41: 285935, 42: 307105, 44: 352529, 45: 729360, 46: 1508416, 47: 3495263, 48: 9912189};
for(let i=21; i<=48; i++) window.EXP_TABLE[i] = midExp[i] || (window.EXP_TABLE[i-1] * 1.1);
for(let i=49; i<=90; i++) window.EXP_TABLE[i] = 36065092;

window.game = window.game || {};

window.CLASS_BASES = {
    prince: { hp: 60, mp: 20, str: 13, dex: 10, con: 12, int: 11, wis: 11, cha: 13, hpGain: 8, mpGain: 2, crit: 5 },
    knight: { hp: 80, mp: 10, str: 16, dex: 12, con: 14, int: 8, wis: 9, cha: 12, hpGain: 12, mpGain: 1, crit: 5 },
    elf: { hp: 55, mp: 30, str: 11, dex: 15, con: 12, int: 12, wis: 12, cha: 9, hpGain: 6, mpGain: 3, crit: 10 },
    mage: { hp: 40, mp: 60, str: 8, dex: 7, con: 12, int: 18, wis: 15, cha: 8, hpGain: 4, mpGain: 6, crit: 0 },
    dark_elf: { hp: 65, mp: 25, str: 12, dex: 15, con: 10, int: 11, wis: 10, cha: 9, hpGain: 7, mpGain: 2, crit: 20 },
    dragon_knight: { hp: 75, mp: 15, str: 15, dex: 11, con: 14, int: 9, wis: 8, cha: 8, hpGain: 10, mpGain: 1, crit: 8 },
    illusionist: { hp: 50, mp: 50, str: 8, dex: 10, con: 11, int: 16, wis: 13, cha: 10, hpGain: 5, mpGain: 4, crit: 5 }
};

// Stat computation functions
window.game.getEffStat = function(stat) {
    let val = window.game.state.baseStats[stat] || 8;
    
    // Amulet slot modifiers
    let amuKey = window.game.state.equipment.amulet;
    if (amuKey && window.game.state.inventory[amuKey]) {
        let amuId = window.game.state.inventory[amuKey].itemId;
        if (stat === 'str' && amuId === 'amulet_str') val += 1;
        if (stat === 'dex' && amuId === 'amulet_dex') val += 1;
        if (stat === 'con' && amuId === 'amulet_con') val += 1;
        if (stat === 'int' && amuId === 'amulet_int') val += 1;
        if (stat === 'wis' && amuId === 'amulet_wis') val += 1;
    }
    
    // Gloves slot modifiers (Power Gloves: str + 2)
    if (stat === 'str' && window.game.state.equipment.gloves) {
        let gKey = window.game.state.equipment.gloves;
        if (window.game.state.inventory[gKey]) {
            let gId = window.game.state.inventory[gKey].itemId;
            if (gId === 'gloves_str') val += 2;
        }
    }
    
    return val;
};

window.game.getSetBonuses = function() {
    let eq = {};
    for(let slot in window.game.state.equipment) {
        let k = window.game.state.equipment[slot];
        if(k && window.game.state.inventory[k]) eq[slot] = window.game.state.inventory[k].itemId;
    }
    let sets = { active: [], ac: 0, hp: 0, dmg: 0, hit: 0, dr: 0 };
    if(eq.helmet === 'helm_dk' && eq.armor === 'armor_dk' && eq.gloves === 'gloves_dk' && eq.boots === 'boots_dk') {
        sets.active.push('死亡騎士套裝'); sets.ac += 6; sets.dr += 3; sets.dmg += 3; sets.hit += 3;
    }
    if(eq.helmet === 'helm_gnome' && eq.cloak === 'cloak_gnome' && eq.shield === 'shield_gnome') {
        sets.active.push('侏儒套裝'); sets.ac += 1; sets.hp += 6;
    }
    if(eq.helmet === 'helm_orc' && eq.cloak === 'orc_cloak' && eq.armor === 'ring_mail_orc' && eq.shield === 'arkai_shield') {
        sets.active.push('歐西斯套裝'); sets.ac += 3; sets.dmg += 1; sets.hit += 1;
    }
    if(eq.helmet === 'helm_skeleton' && eq.armor === 'armor_skeleton' && eq.shield === 'shield_skeleton') {
        sets.active.push('骷髏套裝'); sets.ac += 2; sets.hp += 10;
    }
    return sets;
};

window.game.calculateMaxHpMp = function() {
    let effCon = window.game.getEffStat('con');
    let conBonus = effCon <= 15 ? 0 : effCon - 15;
    let cls = window.game.state.class || 'prince';
    let bases = window.CLASS_BASES[cls] || window.CLASS_BASES.prince;

    // HP formula: ClassBaseHP + (CON * 5) + (level - 1) * (ClassHpGain + conBonus)
    let calcMaxHp = bases.hp + (effCon * 5) + (window.game.state.level - 1) * (bases.hpGain + conBonus);
    
    // Knight HP +30% modifier
    if (cls === 'knight') {
        calcMaxHp = Math.floor(calcMaxHp * 1.3);
    }

    let beltKey = window.game.state.equipment.belt;
    if (beltKey && window.game.state.inventory[beltKey]) {
        let beltName = window.ITEMS[window.game.state.inventory[beltKey].itemId].name;
        if (beltName === '身體腰帶') calcMaxHp += 50;
        if (beltName === '靈魂腰帶') calcMaxHp += 25;
    }
    let sets = window.game.getSetBonuses();
    calcMaxHp += sets.hp;
    window.game.state.maxHp = calcMaxHp;
    
    let effWis = window.game.getEffStat('wis');
    let effInt = window.game.getEffStat('int');
    let wisBonus = -1;
    if(effWis >= 11 && effWis <= 13) wisBonus = 0;
    if(effWis >= 12 && effWis <= 13) wisBonus = 1;
    if(effWis >= 14 && effWis <= 15) wisBonus = 2;
    if(effWis >= 16 && effWis <= 17) wisBonus = 3;
    if(effWis === 18) wisBonus = 4;
    if(effWis > 18) wisBonus = 4 + (effWis - 18);
    
    // MP formula: ClassBaseMP + (INT * 3) + (WIS * 2) + (level - 1) * (ClassMpGain + wisBonus)
    let calcMaxMp = bases.mp + (effInt * 3) + (effWis * 2) + (window.game.state.level - 1) * (bases.mpGain + wisBonus);
    if (beltKey && window.game.state.inventory[beltKey]) {
        let beltName = window.ITEMS[window.game.state.inventory[beltKey].itemId].name;
        if (beltName === '精神腰帶') calcMaxMp += 50;
        if (beltName === '靈魂腰帶') calcMaxMp += 25;
    }
    let robeKey = window.game.state.equipment.armor;
    if (robeKey && window.game.state.inventory[robeKey]) {
        let robeId = window.game.state.inventory[robeKey].itemId;
        if (robeId === 'robe_black_elder') calcMaxMp += 100;
    }
    window.game.state.maxMp = calcMaxMp;
    if(window.game.state.hp > window.game.state.maxHp) window.game.state.hp = window.game.state.maxHp;
    if(window.game.state.mp > window.game.state.maxMp) window.game.state.mp = window.game.state.maxMp;
};

window.game.getAC = function() {
    let ac = 10;
    ac -= Math.floor(window.game.state.level / 8);
    let dex = window.game.getEffStat('dex') + (window.game.state.buffs.dex_buff ? 5 : 0);
    let div = dex < 10 ? 8 : dex < 13 ? 7 : dex < 16 ? 6 : dex < 18 ? 5 : 4;
    ac -= Math.floor(dex / div);
    for(let slot in window.game.state.equipment) {
        let itemKey = window.game.state.equipment[slot];
        if(itemKey && window.game.state.inventory[itemKey]) {
            let item = window.game.state.inventory[itemKey];
            if(window.ITEMS[item.itemId] && window.ITEMS[item.itemId].ac !== undefined) {
                ac += window.ITEMS[item.itemId].ac;
                ac -= Number(item.enchant);
                if (item.isBlessed) ac -= 1;
            }
        }
    }
    let sets = window.game.getSetBonuses();
    ac -= sets.ac;
    if(window.game.state.buffs.shield) ac -= 2;
    if(window.game.state.buffs.berserkers) ac += 10;
    return ac;
};

window.game.getDamageReduction = function() {
    let dr = 0;
    for(let slot in window.game.state.equipment) {
        if (slot === 'weapon') continue; 
        let itemKey = window.game.state.equipment[slot];
        if(itemKey && window.game.state.inventory[itemKey]) {
            let item = window.game.state.inventory[itemKey];
            if(item.isBlessed && window.ITEMS[item.itemId] && window.ITEMS[item.itemId].type !== 'weapon') dr += 1;
        }
    }
    let sets = window.game.getSetBonuses();
    dr += sets.dr;
    return dr;
};

window.game.getStrBonus = function() {
    let str = window.game.getEffStat('str') + (window.game.state.buffs.str_buff ? 5 : 0);
    let dmg = 0, hit = 0;
    if(str===8) { dmg=-2; hit=-1; }
    else if(str===9) { dmg=-1; hit=-1; }
    else if(str===10) { dmg=-1; hit=0; }
    else if(str===11) { dmg=0; hit=0; }
    else if(str===12) { dmg=0; hit=1; }
    else if(str===13) { dmg=1; hit=1; }
    else if(str===14) { dmg=1; hit=2; }
    else if(str===15) { dmg=2; hit=2; }
    else if(str===16) { dmg=2; hit=3; }
    else if(str===17) { dmg=3; hit=3; }
    else if(str>17) {
        dmg=3; hit=3;
        for(let i=18; i<=str; i++) { if(dmg === hit) hit++; else dmg++; }
    }
    return { dmg, hit };
};

window.game.getDexBonus = function() {
    let dex = window.game.getEffStat('dex') + (window.game.state.buffs.dex_buff ? 5 : 0);
    let hit = 0, er = 0;
    if(dex===8) { hit=-1; er=0; }
    else if(dex===9) { hit=0; er=0; }
    else if(dex===10) { hit=0; er=1; }
    else if(dex===11) { hit=1; er=1; }
    else if(dex===12) { hit=1; er=2; }
    else if(dex===13) { hit=2; er=2; }
    else if(dex===14) { hit=2; er=3; }
    else if(dex===15) { hit=3; er=3; }
    else if(dex===16) { hit=3; er=4; }
    else if(dex===17) { hit=4; er=4; }
    else if(dex===18) { hit=4; er=5; }
    else if(dex>18) {
        hit = 4 + (dex - 18);
        er = 5 + Math.floor((dex - 18) / 2);
    }
    return { hit, er };
};

window.game.getMeleeHit = function() {
    let strBonus = window.game.getStrBonus().hit;
    let dexBonus = window.game.getDexBonus().hit;
    let wpnHit = 0;
    let wKey = window.game.state.equipment.weapon;
    if(wKey && window.game.state.inventory[wKey]) {
        let item = window.game.state.inventory[wKey];
        if(window.ITEMS[item.itemId]) {
            wpnHit = (window.ITEMS[item.itemId].hit || 0) + Number(item.enchant);
            if (item.isBlessed) wpnHit += 1;
        }
    }
    let sets = window.game.getSetBonuses();
    return strBonus + dexBonus + wpnHit + sets.hit;
};

window.game.getMeleeDmg = function() {
    let cls = window.game.state.class || 'prince';
    let statBonus = 0;
    
    // Ranged Elf DEX-scaling, other classes Melee STR-scaling
    if (cls === 'elf') {
        let effDex = window.game.getEffStat('dex') + (window.game.state.buffs.dex_buff ? 5 : 0);
        statBonus = Math.floor(effDex * 1.5);
    } else {
        let effStr = window.game.getEffStat('str') + (window.game.state.buffs.str_buff ? 5 : 0);
        statBonus = Math.floor(effStr * 1.5);
    }
    
    let wpnDmg = 0;
    let wKey = window.game.state.equipment.weapon;
    if(wKey && window.game.state.inventory[wKey]) {
        let item = window.game.state.inventory[wKey];
        wpnDmg = Number(item.enchant);
        if (item.isBlessed) wpnDmg += 1;
    }
    if (window.game.state.buffs.enchant_weapon) wpnDmg += 2;
    if (window.game.state.buffs.berserkers) wpnDmg += 5;
    if (window.game.state.buffs.player_weapon_break > 0) wpnDmg -= 10;
    let sets = window.game.getSetBonuses();
    return statBonus + wpnDmg + sets.dmg;
};

window.game.getMagicDmg = function() {
    let cls = window.game.state.class || 'prince';
    let multiplier = (cls === 'mage') ? 2 : 1; // Mage has +100% Spell Dmg
    let effInt = window.game.getEffStat('int');
    
    // Magic Dmg formula: multiplier * INT * 2
    let m = Math.floor(multiplier * effInt * 2);
    
    let wKey = window.game.state.equipment.weapon;
    if(wKey && window.game.state.inventory[wKey]) {
        let item = window.game.state.inventory[wKey];
        if(window.ITEMS[item.itemId] && window.ITEMS[item.itemId].mDmg) m += window.ITEMS[item.itemId].mDmg;
    }
    let armorKey = window.game.state.equipment.armor;
    if (armorKey && window.game.state.inventory[armorKey]) {
        let item = window.game.state.inventory[armorKey];
        if(window.ITEMS[item.itemId] && window.ITEMS[item.itemId].mDmg) m += window.ITEMS[item.itemId].mDmg;
    }
    if (window.game.state.buffs.potion_wisdom) m += 2;
    return m + Math.floor(window.game.state.level / 4);
};

window.game.getMR = function() {
    let effWis = window.game.getEffStat('wis');
    let mr = 0;
    if(effWis<=14) mr=0; 
    else if(effWis>=15&&effWis<=16) mr=3; 
    else if(effWis===17) mr=6; 
    else if(effWis===18) mr=10; 
    else if(effWis>18&&effWis<=26) mr=10+(effWis-18)*5; 
    else if(effWis>26) mr=50+(effWis-26)*2;
    mr += Math.floor(window.game.state.level / 4);

    for(let slot in window.game.state.equipment) {
        let itemKey = window.game.state.equipment[slot];
        if(itemKey && window.game.state.inventory[itemKey]) {
            let item = window.game.state.inventory[itemKey];
            if(window.ITEMS[item.itemId] && window.ITEMS[item.itemId].mr !== undefined) mr += window.ITEMS[item.itemId].mr;
        }
    }
    if (window.game.state.equipment.ring1 && window.game.state.inventory[window.game.state.equipment.ring1]) {
        let rId = window.game.state.inventory[window.game.state.equipment.ring1].itemId;
        if(window.ITEMS[rId] && window.ITEMS[rId].mr !== undefined) mr += window.ITEMS[rId].mr;
    }
    if (window.game.state.equipment.ring2 && window.game.state.inventory[window.game.state.equipment.ring2]) {
        let rId = window.game.state.inventory[window.game.state.equipment.ring2].itemId;
        if(window.ITEMS[rId] && window.ITEMS[rId].mr !== undefined) mr += window.ITEMS[rId].mr;
    }
    return Math.min(100, mr);
};

window.game.getER = function() {
    return window.game.getDexBonus().er;
};

window.game.getAvailableSpells = function() {
    let spells = new Set(window.game.state.spells || []);
    let helmKey = window.game.state.equipment && window.game.state.equipment.helmet;
    if (helmKey && window.game.state.inventory && window.game.state.inventory[helmKey]) {
        let helmId = window.game.state.inventory[helmKey].itemId;
        if (helmId === 'helm_heal_magic') { spells.add('heal'); spells.add('mid_heal'); }
        if (helmId === 'helm_str_magic') { spells.add('enchant_weapon'); spells.add('str_buff'); spells.add('detection'); }
        if (helmId === 'helm_dex_magic') { spells.add('dex_buff'); spells.add('haste'); }
    }
    return Array.from(spells);
};

// Player action mappings
window.game.equip = function(itemKey) {
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    if(!def) return;
    let slotToEquip = def.type;
    
    if (def.type === 'ring') {
        if (!window.game.state.equipment.ring1) slotToEquip = 'ring1';
        else if (!window.game.state.equipment.ring2) slotToEquip = 'ring2';
        else slotToEquip = 'ring1';
    } else if (def.type === 'earring') {
        if (!window.game.state.equipment.earring1) slotToEquip = 'earring1';
        else if (!window.game.state.equipment.earring2) slotToEquip = 'earring2';
        else slotToEquip = 'earring1';
    }
    
    if(def.type === 'weapon' && def.hands === 2 && window.game.state.equipment.shield) window.game.state.equipment.shield = null;
    if(def.type === 'shield' && window.game.state.equipment.weapon) {
        let wpn = window.game.state.inventory[window.game.state.equipment.weapon];
        if(wpn && window.ITEMS[wpn.itemId] && window.ITEMS[wpn.itemId].hands === 2) window.game.state.equipment.weapon = null;
    }

    window.game.state.equipment[slotToEquip] = itemKey;
    window.game.calculateMaxHpMp();
    window.game.logSystem(`裝備了 ${window.game.getDisplayName(item, def)}。`);
    window.game.updateSettingsUI(); 
    window.game.updateUI();
    window.game.renderInventory();
    window.game.renderSkills();
};

window.game.unequip = function(slot) {
    if(window.game.state.equipment[slot]) {
        window.game.state.equipment[slot] = null;
        window.game.calculateMaxHpMp();
        window.game.updateSettingsUI();
        window.game.updateUI();
        window.game.renderInventory();
        window.game.renderSkills();
    }
};

window.game.usePotion = function(itemKey) {
    if (window.game.state.buffs.petrified > 0 || window.game.state.buffs.stun > 0) {
        window.game.logCombat(`異常狀態中無法喝水。`, 'danger');
        return;
    }
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    window.game.removeInventory(itemKey, 1);
    
    if(def.type === 'potion_hp') {
        let con = window.game.getEffStat('con');
        let bonus = 0;
        if(con>=18&&con<=24) bonus=1; else if(con>=25&&con<=30) bonus=2; else if(con>=31&&con<=35) bonus=3; else if(con>=36&&con<=40) bonus=4; else if(con>=41&&con<=45) bonus=5; else if(con>=46&&con<=50) bonus=6;
        
        let h = def.heal + bonus;
        if (window.game.state.buffs.heal_erosion) h = Math.floor(h / 2);
        
        window.game.state.hp = Math.min(window.game.state.maxHp, window.game.state.hp + h);
        window.game.logCombat(`使用了 ${def.name}。恢復了 ${h} 點體力。`, 'hit');
    } else if(def.type === 'potion_mp') {
        window.game.state.buffs.potion_blue = def.duration;
        window.game.logCombat(`使用了 藍色藥水。魔力回復速度提升。`, 'hit');
    } else if(def.type === 'potion_buff') {
        window.game.state.buffs.potion_wisdom = def.duration;
        window.game.logCombat(`使用了 慎重藥水。魔攻與魔力回復量提升。`, 'hit');
    }
    window.game.updateUI();
};

window.game.learnSpell = function(itemKey) {
    if (window.game.state.buffs.petrified > 0 || window.game.state.buffs.stun > 0) {
        window.game.logCombat(`異常狀態中無法學習魔法。`, 'danger');
        return;
    }
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    let spellId = def.spellId;
    
    if(window.game.state.spells.includes(spellId)) {
        window.game.logSystem(`你已經學會了 ${window.SPELLS[spellId].name}。`, 'warn');
    } else {
        window.game.state.spells.push(spellId);
        window.game.removeInventory(itemKey, 1);
        window.game.logSystem(`學會了新魔法：${window.SPELLS[spellId].name}！`, 'reward');
        window.game.renderSkills();
        window.game.updateSettingsUI();
    }
};

window.game.checkLevelUp = function() {
    let req = window.EXP_TABLE[window.game.state.level] || 36065092;
    if(window.game.state.exp >= req && window.game.state.level < 90) {
        window.game.state.level++;
        window.game.state.exp -= req;
        window.game.calculateMaxHpMp();
        window.game.state.hp = window.game.state.maxHp;
        window.game.state.mp = window.game.state.maxMp;
        
        if(window.game.state.level >= 50) {
            window.game.state.bonusPoints++;
            window.game.logSystem(`獲得 1 點額外能力點數。(介面尚未實作)`, 'reward');
        }
        
        window.game.logSystem(`升級了！達到 等級 ${window.game.state.level}。`, 'reward');
        window.game.updateSettingsUI();
        window.game.renderSkills(); 
        window.game.checkLevelUp();
    }
};

window.game.checkPlayerDeath = function() {
    if(window.game.state.hp <= 0) {
        let availSpells = window.game.getAvailableSpells();
        if (availSpells.includes('resurrection') && window.game.state.mp >= 50) {
            window.game.state.mp -= 50;
            window.game.state.hp = 1;
            window.game.logCombat(`【返生術】發動！消耗 50 MP，免於一死。`, 'magic');
            window.game.updateUI();
            return;
        }
        window.game.playerDied();
    }
};

window.game.playerDied = function() {
    window.game.stopBattle();
    let req = window.EXP_TABLE[window.game.state.level] || 36065092;
    let pen = Math.floor(req * 0.1);
    window.game.state.exp = Math.max(0, window.game.state.exp - pen);
    window.game.state.hp = Math.floor(window.game.state.maxHp * 0.1);
    window.game.logSystem(`你死亡了！失去經驗值。`, 'danger');
    window.game.updateUI();
    
    if (document.getElementById('target-name-arena')) {
        document.getElementById('target-name-arena').innerText = '尋找目標中...';
        document.getElementById('target-name-arena').className = 'c-err font-black text-xl tracking-wider text-shadow';
    }
    
    setTimeout(() => { window.game.logSystem('在村莊中復活。'); window.game.startBattle(); }, 3000);
};
