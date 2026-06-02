// 遊戲核心引擎與資料庫 (v0.2.3)
window.RateXp = 5;            // 經驗值倍率
window.RateDropAdena = 5;     // 金幣掉落數量倍率
window.RateDropItems = 5;     // 道具與卷軸掉落機率倍率

window.chineseNumbers = ["零","一","二","三","四","五","六","七","八","九","十"];
window.getChineseNumber = function(num) { return (num>=0 && num<=10) ? window.chineseNumbers[num] : num; };

window.canCastSpell = function(spellLevel, playerLevel) {
    let reqLevel = spellLevel === 1 ? 1 : spellLevel * 4;
    return playerLevel >= reqLevel;
};

window.rollDice = function(dice) {
    if (!dice || typeof dice !== 'string') return 0;
    const parts = dice.toLowerCase().split('d');
    if (parts.length !== 2) return parseInt(dice) || 0;
    const count = parseInt(parts[0]) || 1;
    const sides = parseInt(parts[1]) || 1;
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
    }
    return sum;
};

window.compareItems = function(keyA, keyB, inventory) {
    let itemA = inventory[keyA], itemB = inventory[keyB];
    let defA = window.ITEMS[itemA.itemId] || { type: 'unknown', name: '未知' };
    let defB = window.ITEMS[itemB.itemId] || { type: 'unknown', name: '未知' };
    const typeOrder = { 'potion_hp':1, 'potion_mp':1, 'potion_buff':1, 'scroll':2, 'book':3, 'weapon':4, 'helmet':5, 'armor':6, 'shield':7, 'cloak':8, 'leggings':9, 'gloves':10, 'boots':11, 'amulet':12, 'earring':13, 'belt':14, 'ring':15, 'quest':99 };
    let tA = typeOrder[defA.type] || 99, tB = typeOrder[defB.type] || 99;
    if (tA !== tB) return tA - tB;
    let bA = itemA.isBlessed || defA.isBlessed ? 1 : 0, bB = itemB.isBlessed || defB.isBlessed ? 1 : 0;
    if (bA !== bB) return bB - bA; 
    const getSellPrice = (it, d) => {
        if (d.type === 'book') return 100 * Math.pow((window.SPELLS[d.spellId] && window.SPELLS[d.spellId].level) || 1, 2);
        let isEquipType = ['weapon','helmet','armor','shield','cloak','boots','leggings','gloves','amulet','earring','belt','ring'].includes(d.type);
        if (isEquipType && Number(it.enchant) === 0 && !d.unique) {
            if (it.isBlessed || d.isBlessed) return 100000;
            let realDr = (d.dropRate || 1) / 100;
            if (d.type === 'weapon') return Math.floor(60 / realDr);
            if (['amulet', 'ring', 'belt', 'earring'].includes(d.type)) return Math.floor(100 / realDr);
            return Math.floor(30 / realDr);
        }
        return 0;
    };
    let pA = getSellPrice(itemA, defA), pB = getSellPrice(itemB, defB);
    if (pA !== pB) return pB - pA; 
    if (defA.type === 'weapon') {
        const getMaxDmg = (dice, enchant, isBlessed) => {
            if(!dice) return 0;
            let max = 0;
            dice.split('+').forEach(p => {
                if(p.includes('d') || p.includes('D')) {
                    let [num, sides] = p.toLowerCase().split('d').map(Number);
                    max += num * sides;
                } else max += Number(p);
            });
            return max + Number(enchant) + (isBlessed ? 1 : 0);
        };
        let dmA = getMaxDmg(defA.dice, itemA.enchant, itemA.isBlessed), dmB = getMaxDmg(defB.dice, itemB.enchant, itemB.isBlessed);
        if (dmA !== dmB) return dmB - dmA; 
    } else if (['helmet','armor','shield','cloak','boots','leggings','gloves','amulet','earring','belt','ring'].includes(defA.type)) {
        const getACValue = (it, d) => { let ac = d.ac || 0; ac -= Number(it.enchant); if (it.isBlessed) ac -= 1; return ac; };
        let acA = getACValue(itemA, defA), acB = getACValue(itemB, defB);
        if (acA !== acB) return acA - acB;
    }
    if (Number(itemA.enchant) !== Number(itemB.enchant)) return Number(itemB.enchant) - Number(itemA.enchant);
    return defA.name.localeCompare(defB.name);
};

window.ITEMS = {
    dagger_orc: { name: '歐西斯匕首', type: 'weapon', hands: 1, speed: 800, safe: 6, dice: '1d3', hit: 2, dropRate: 1 },
    short_sword_orc: { name: '歐西斯短劍', type: 'weapon', hands: 1, speed: 900, safe: 6, dice: '1d4', hit: 0, dropRate: 5 },
    broadsword: { name: '闊劍', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d5', hit: 0, dropRate: 1 },
    club: { name: '木棒', type: 'weapon', hands: 1, speed: 1100, safe: 6, dice: '1d6', hit: 0, dropRate: 1 },
    long_sword: { name: '長劍', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d10', hit: 0, dropRate: 2 },
    short_sword_gnome: { name: '小侏儒短劍', type: 'weapon', hands: 1, speed: 900, safe: 6, dice: '1d7', hit: 0, dropRate: 1 },
    fauchard: { name: '法丘', type: 'weapon', hands: 2, speed: 1200, safe: 6, dice: '1d16', hit: 0, dropRate: 1 },
    battle_axe: { name: '戰斧', type: 'weapon', hands: 2, speed: 1400, safe: 6, dice: '1d18', hit: 0, dropRate: 2 },
    scimitar: { name: '彎刀', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d8', hit: 0, dropRate: 1 },
    magic_staff: { name: '巫術魔法杖', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d3', hit: 0, mDmg: 1, dropRate: 2 },
    giant_axe: { name: '巨斧', type: 'weapon', hands: 2, speed: 1200, safe: 6, dice: '1d23', hit: 0, dropRate: 2 },
    berserk_axe: { name: '狂戰士斧', type: 'weapon', hands: 2, speed: 1000, safe: 6, dice: '1d19', hit: 0, dropRate: 1 },
    dagger_ori: { name: '奧里哈魯根短劍', type: 'weapon', hands: 1, speed: 900, safe: 6, dice: '1d7', hit: 0, isUndeadSlayer: true, dropRate: 0.1 },
    dagger_mithril: { name: '米索莉短劍', type: 'weapon', hands: 1, speed: 800, safe: 6, dice: '1d6', hit: 0, isUndeadSlayer: true, dropRate: 0.5 },
    sword_tsurugi: { name: '瑟魯基之劍', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d13', hit: 2, dropRate: 1 },
    katana: { name: '武士刀', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d11', hit: 1, dropRate: 3 },
    hammer_thor: { name: '雷神之槌', type: 'weapon', hands: 2, speed: 1200, safe: 6, dice: '1d11', hit: 3, dropRate: 0.005, legendary: true, desc: '攻擊時有機率發動極道落雷。' },
    broad_spear: { name: '闊矛', type: 'weapon', hands: 2, speed: 1000, safe: 6, dice: '1d14', hit: 0, dropRate: 5 },
    staff_mana: { name: '瑪那魔杖', type: 'weapon', hands: 1, speed: 1000, safe: 6, dice: '1d3', hit: -3, dropRate: 1, desc: '命中恢復1魔力。' },
    sword_dk_fire: { name: '死亡騎士的烈炎之劍', type: 'weapon', hands: 1, speed: 800, safe: 6, dice: '1d13', hit: 5, dropRate: 0.1, legendary: true, desc: '攻擊時有機率發動烈炎術。' },
    sword_two_handed: { name: '雙手劍', type: 'weapon', hands: 2, speed: 1100, safe: 6, dice: '1d19', hit: 0, dropRate: 1 },
    helm_orc: { name: '歐西斯頭盔', type: 'helmet', safe: 4, ac: -1, dropRate: 1 },
    ring_mail_orc: { name: '歐西斯環甲', type: 'armor', safe: 4, ac: -4, dropRate: 5 },
    boots_short: { name: '短統靴', type: 'boots', safe: 4, ac: -1, dropRate: 1 },
    chain_mail_orc: { name: '歐西斯鏈甲', type: 'armor', safe: 4, ac: -4, dropRate: 1 },
    studded_leather: { name: '銀釘皮甲', type: 'armor', safe: 4, ac: -3, dropRate: 3 },
    boots_long: { name: '長靴', type: 'boots', safe: 4, ac: -2, dropRate: 0.3 },
    shield_small: { name: '小盾牌', type: 'shield', safe: 4, ac: -1, dropRate: 5 },
    helm_gnome: { name: '侏儒鐵盔', type: 'helmet', safe: 4, ac: -2, dropRate: 0.5 },
    cloak_gnome: { name: '侏儒斗篷', type: 'cloak', safe: 4, ac: 0, dropRate: 5 },
    shield_gnome: { name: '侏儒圓盾', type: 'shield', safe: 4, ac: -2, dropRate: 8 },
    scale_mail: { name: '鱗甲', type: 'armor', safe: 4, ac: -4, dropRate: 4 },
    shield_large: { name: '大盾牌', type: 'shield', safe: 4, ac: -2, dropRate: 3 },
    antic_cloak: { name: '抗魔法斗篷', type: 'cloak', safe: 4, ac: -1, mr: 10, dropRate: 1 },
    orc_cloak: { name: '歐西斯斗篷', type: 'cloak', safe: 4, ac: 0, dropRate: 5 },
    antic_chain_mail: { name: '抗魔法鏈甲', type: 'armor', safe: 4, ac: -5, mr: 4, dropRate: 1 },
    arkai_shield: { name: '阿克海盾牌', type: 'shield', safe: 4, ac: -1, dropRate: 10 },
    steel_helmet: { name: '鋼盔', type: 'helmet', safe: 4, ac: -1, dropRate: 1 },
    helm_heal_magic: { name: '治癒魔法頭盔', type: 'helmet', safe: 4, ac: -1, dropRate: 0.5, desc: '賦予治癒法術。' },
    cloak_protector: { name: '保護者斗篷', type: 'cloak', safe: 4, ac: -3, dropRate: 5 },
    armor_rattan: { name: '藤甲', type: 'armor', safe: 4, ac: -6, dropRate: 3 },
    helm_str_magic: { name: '力量魔法頭盔', type: 'helmet', safe: 4, ac: -1, dropRate: 0.2, desc: '賦予體魄強健等法術。' },
    armor_bronze: { name: '青銅盔甲', type: 'armor', safe: 4, ac: -6, dropRate: 0.3 },
    gloves_normal: { name: '手套', type: 'gloves', safe: 4, ac: 0, dropRate: 1 },
    gloves_str: { name: '力量手套', type: 'gloves', safe: 4, ac: 0, dropRate: 0.05, desc: '力量+2' },
    armor_metal: { name: '金屬盔甲', type: 'armor', safe: 4, ac: -7, dropRate: 1 },
    armor_crystal: { name: '水晶盔甲', type: 'armor', safe: 4, ac: -8, dropRate: 3 },
    helm_antic_magic: { name: '抗魔法頭盔', type: 'helmet', safe: 4, ac: -2, mr: 4, dropRate: 0.1 },
    robe_black_elder: { name: '黑長者長袍', type: 'armor', safe: 4, ac: -7, mDmg: 1, dropRate: 0.05, legendary: true, desc: 'MP+100, 魔力恢復+20' },
    sandals_black_elder: { name: '黑長者涼鞋', type: 'boots', safe: 4, ac: -3, dropRate: 0.05, legendary: true, desc: '魔力恢復+10' },
    helm_dex_magic: { name: '敏捷魔法頭盔', type: 'helmet', safe: 4, ac: -1, dropRate: 0.5, desc: '賦予加速術等法術。' },
    shield_skeleton: { name: '骷髏盾牌', type: 'shield', safe: 0, ac: -3, dropRate: 1 },
    armor_skeleton: { name: '骷髏盔甲', type: 'armor', safe: 0, ac: -5, dropRate: 1 },
    helm_skeleton: { name: '骷髏頭盔', type: 'helmet', safe: 0, ac: -3, dropRate: 1 },
    boots_dk: { name: '死亡騎士長靴', type: 'boots', safe: 4, ac: -3, dropRate: 0.5, legendary: true },
    gloves_dk: { name: '死亡騎士手套', type: 'gloves', safe: 4, ac: -2, dropRate: 0.5, legendary: true },
    armor_dk: { name: '死亡騎士盔甲', type: 'armor', safe: 4, ac: -7, dropRate: 0.5, legendary: true },
    helm_dk: { name: '死亡騎士頭盔', type: 'helmet', safe: 4, ac: -3, dropRate: 0.5, legendary: true },
    belt_ogre: { name: '歐吉皮帶', type: 'belt', safe: 0, ac: 0, dropRate: 0.05 },
    amulet_wis: { name: '精神項鍊', type: 'amulet', safe: 0, ac: 0, dropRate: 0.1, desc: '精神+1' },
    amulet_con: { name: '體質項鍊', type: 'amulet', safe: 0, ac: 0, dropRate: 0.1, desc: '體質+1' },
    ring_earth: { name: '地靈戒指', type: 'ring', safe: 0, ac: 0, mr: 6, dropRate: 0.01 },
    belt_body: { name: '身體腰帶', type: 'belt', safe: 0, ac: 0, dropRate: 0.01, desc: 'HP+50' },
    belt_soul: { name: '靈魂腰帶', type: 'belt', safe: 0, ac: 0, dropRate: 0.01, desc: 'HP+25，MP+25' },
    belt_mind: { name: '精神腰帶', type: 'belt', safe: 0, ac: 0, dropRate: 0.01, desc: 'MP+50' },
    belt_doro: { name: '多羅皮帶', type: 'belt', safe: 0, ac: 0, dropRate: 0.3 },
    ring_harpy: { name: '哈維戒指', type: 'ring', safe: 0, ac: 0, mr: 3, dropRate: 0.01 },
    ring: { name: '戒指', type: 'ring', safe: 0, ac: 0, dropRate: 0.8 },
    amulet_dex: { name: '敏捷項鍊', type: 'amulet', safe: 0, ac: 0, dropRate: 0.1, desc: '敏捷+1' },
    amulet_int: { name: '智力項鍊', type: 'amulet', safe: 0, ac: 0, dropRate: 0.1, desc: '智力+1' },
    ring_wind: { name: '風靈戒指', type: 'ring', safe: 0, ac: 0, mr: 6, dropRate: 0.15 },
    amulet_str: { name: '力量項鍊', type: 'amulet', safe: 0, ac: 0, dropRate: 0.3, desc: '力量+1' },
    scroll_weapon: { name: '對武器施法的卷軸', type: 'scroll', target: 'weapon', isBlessed: false, price: 1000 },
    scroll_weapon_blessed: { name: '受祝福的對武器施法的卷軸', type: 'scroll', target: 'weapon', isBlessed: true },
    scroll_armor: { name: '對盔甲施法的卷軸', type: 'scroll', target: 'armor', isBlessed: false, price: 500 },
    scroll_armor_blessed: { name: '受祝福的對盔甲施法的卷軸', type: 'scroll', target: 'armor', isBlessed: true },
    scroll_accessory: { name: '對飾品施法的卷軸', type: 'scroll', target: 'accessory', isBlessed: false },
    potion_red: { name: '治癒藥水', type: 'potion_hp', heal: 15, price: 37 },
    potion_orange: { name: '強力治癒藥水', type: 'potion_hp', heal: 40, price: 200 },
    potion_clear: { name: '終極治癒藥水', type: 'potion_hp', heal: 60, price: 600 },
    potion_blue: { name: '藍色藥水', type: 'potion_mp', duration: 600, price: 1046 },
    potion_wisdom: { name: '慎重藥水', type: 'potion_buff', duration: 300, price: 750 },
    wyrm_claw: { name: '飛龍的爪子', type: 'quest', unique: true },
    book_light: { name: '魔法書(光箭)', type: 'book', spellId: 'light_arrow' },
    book_heal: { name: '魔法書(初級治癒術)', type: 'book', spellId: 'heal' },
    book_shield: { name: '魔法書(保護罩)', type: 'book', spellId: 'shield' },
    book_vampire: { name: '魔法書(吸血鬼之吻)', type: 'book', spellId: 'vampire' },
    book_dex: { name: '魔法書(通暢氣脈術)', type: 'book', spellId: 'dex_buff' },
    book_slow: { name: '魔法書(緩速術)', type: 'book', spellId: 'slow' },
    book_earth: { name: '魔法書(地裂術)', type: 'book', spellId: 'earth' },
    book_dark: { name: '魔法書(黑闇之影)', type: 'book', spellId: 'darkness' },
    book_zombie: { name: '魔法書(造屍術)', type: 'book', spellId: 'create_zombie' },
    book_sleep_mist: { name: '魔法書(沉睡之霧)', type: 'book', spellId: 'sleep_mist' },
    book_disease: { name: '魔法書(疾病術)', type: 'book', spellId: 'disease' },
    book_immune: { name: '魔法書(聖結界)', type: 'book', spellId: 'immune_to_harm' },
    book_berserker: { name: '魔法書(狂暴術)', type: 'book', spellId: 'berserkers' },
    book_weapon_break: { name: '魔法書(壞物術)', type: 'book', spellId: 'weapon_break' },
    book_fire_arrow: { name: '魔法書(烈炎術)', type: 'book', spellId: 'fire_arrow' },
    book_fireball: { name: '魔法書(燃燒的火球)', type: 'book', spellId: 'fireball' },
    book_summon: { name: '魔法書(召喚術)', type: 'book', spellId: 'summon_ogre' },
    book_tame: { name: '魔法書(迷魅術)', type: 'book', spellId: 'tame_monster' },
    book_lightning_storm: { name: '魔法書(雷霆風暴)', type: 'book', spellId: 'lightning_storm' },
    book_resurrect: { name: '魔法書(返生術)', type: 'book', spellId: 'resurrection' },
    book_full_heal: { name: '魔法書(體力回復術)', type: 'book', spellId: 'full_heal' },
    book_high_heal: { name: '魔法書(高級治癒術)', type: 'book', spellId: 'high_heal' },
    book_mid_heal: { name: '魔法書(中級治癒術)', type: 'book', spellId: 'mid_heal' },
    book_call_lightning: { name: '魔法書(極道落雷)', type: 'book', spellId: 'call_lightning' },
    book_str_buff: { name: '魔法書(體魄強健術)', type: 'book', spellId: 'str_buff' },
    book_detection: { name: '魔法書(無所遁形術)', type: 'book', spellId: 'detection' },
    book_enchant_weapon: { name: '魔法書(擬似魔法武器)', type: 'book', spellId: 'enchant_weapon' },
    book_tornado: { name: '魔法書(龍捲風)', type: 'book', spellId: 'tornado' },
    book_blizzard: { name: '魔法書(冰雪暴)', type: 'book', spellId: 'blizzard' },
    book_greater_haste: { name: '魔法書(強力加速術)', type: 'book', spellId: 'greater_haste' },
    book_earth_prison: { name: '魔法書(岩牢)', type: 'book', spellId: 'earth_prison' },
    book_quake: { name: '魔法書(震裂術)', type: 'book', spellId: 'quake' },
    book_cancel: { name: '魔法書(魔法相消術)', type: 'book', spellId: 'cancel' },
    book_haste: { name: '魔法書(加速術)', type: 'book', spellId: 'haste' },
    book_fire_storm: { name: '魔法書(火風暴)', type: 'book', spellId: 'fire_storm' }
};

window.SPELLS = {
    light_arrow: { id: 'light_arrow', name: '光箭', level: 1, type: 'attack', mp: 3, dice: '1d4', baseDmg: 3 },
    heal: { id: 'heal', name: '初級治癒術', level: 1, type: 'heal', mp: 4, healBase: 15 },
    shield: { id: 'shield', name: '保護罩', level: 1, type: 'buff', mp: 2, duration: 1200 },
    vampire: { id: 'vampire', name: '吸血鬼之吻', level: 4, type: 'attack', mp: 13, dice: '4d4', baseDmg: 6, healDice: '4d4' },
    dex_buff: { id: 'dex_buff', name: '通暢氣脈術', level: 4, type: 'buff', mp: 45, duration: 1200 },
    slow: { id: 'slow', name: '緩速術', level: 4, type: 'attack', mp: 20, duration: 30 },
    earth: { id: 'earth', name: '地裂術', level: 6, type: 'attack', mp: 25, dice: '6d8', baseDmg: 16 },
    darkness: { id: 'darkness', name: '黑闇之影', level: 5, type: 'attack', mp: 25, duration: 20 },
    create_zombie: { id: 'create_zombie', name: '造屍術', level: 6, type: 'buff', mp: 35, duration: 3600 },
    sleep_mist: { id: 'sleep_mist', name: '沉睡之霧', level: 9, type: 'attack', mp: 40 },
    disease: { id: 'disease', name: '疾病術', level: 7, type: 'attack', mp: 30, duration: 30 },
    immune_to_harm: { id: 'immune_to_harm', name: '聖結界', level: 9, type: 'buff', mp: 30, duration: 32 },
    berserkers: { id: 'berserkers', name: '狂暴術', level: 7, type: 'buff', mp: 40, duration: 1200 },
    weapon_break: { id: 'weapon_break', name: '壞物術', level: 4, type: 'attack', mp: 25, duration: 20 },
    fire_arrow: { id: 'fire_arrow', name: '烈炎術', level: 6, type: 'attack', mp: 30, dice: '9d6', baseDmg: 20 },
    fireball: { id: 'fireball', name: '燃燒的火球', level: 4, type: 'attack', mp: 16, dice: '1d16' },
    summon_ogre: { id: 'summon_ogre', name: '召喚術', level: 7, type: 'buff', mp: 50, duration: 3600 },
    tame_monster: { id: 'tame_monster', name: '迷魅術', level: 5, type: 'buff', mp: 30, duration: 3600 },
    lightning_storm: { id: 'lightning_storm', name: '雷霆風暴', level: 9, type: 'attack', mp: 48, dice: '1d18' },
    resurrection: { id: 'resurrection', name: '返生術', level: 8, type: 'passive' },
    full_heal: { id: 'full_heal', name: '體力回復術', level: 7, type: 'heal', mp: 35, healBase: 70 },
    high_heal: { id: 'high_heal', name: '高級治癒術', level: 5, type: 'heal', mp: 20, healBase: 50 },
    mid_heal: { id: 'mid_heal', name: '中級治癒術', level: 3, type: 'heal', mp: 11, healBase: 30 },
    call_lightning: { id: 'call_lightning', name: '極道落雷', level: 5, type: 'attack', mp: 25, dice: '5d16', baseDmg: 0 },
    str_buff: { id: 'str_buff', name: '體魄強健術', level: 6, type: 'buff', mp: 0, duration: 1200 }, 
    detection: { id: 'detection', name: '無所遁形術', level: 2, type: 'passive' },
    enchant_weapon: { id: 'enchant_weapon', name: '擬似魔法武器', level: 2, type: 'buff', mp: 20, duration: 1800 },
    tornado: { id: 'tornado', name: '龍捲風', level: 7, type: 'attack', mp: 45, dice: '1d20' },
    blizzard: { id: 'blizzard', name: '冰雪暴', level: 8, type: 'attack', mp: 60, dice: '1d10' },
    greater_haste: { id: 'greater_haste', name: '強力加速術', level: 7, type: 'buff', mp: 60, duration: 2400 },
    earth_prison: { id: 'earth_prison', name: '岩牢', level: 4, type: 'attack', mp: 11, dice: '2d8' },
    quake: { id: 'quake', name: '震裂術', level: 8, type: 'attack', mp: 40, dice: '3d6' },
    cancel: { id: 'cancel', name: '魔法相消術', level: 6, type: 'passive' },
    haste: { id: 'haste', name: '加速術', level: 6, type: 'buff', mp: 40, duration: 1200 },
    fire_storm: { id: 'fire_storm', name: '火風暴', level: 9, type: 'attack', mp: 48, dice: '3d10' }
};

window.game = window.game || {};

// Initialize state
window.game.state = {
    isPlaying: false, level: 1, exp: 0, adena: 0, hp: 0, maxHp: 0, mp: 0, maxMp: 0,
    class: 'prince', gender: 'male', bgmPlaying: false,
    baseStats: { str: 13, dex: 10, con: 12, int: 11, wis: 11, cha: 13 }, createPoints: 10, bonusPoints: 0,
    inventory: {}, equipment: { weapon: null, shield: null, helmet: null, tshirt: null, armor: null, leggings: null, boots: null, cloak: null, gloves: null, amulet: null, earring1: null, earring2: null, ring1: null, ring2: null, belt: null },
    spells: [], buffs: {},
    settings: { autoHpThreshold: 5, autoHpType: 'potion_red', autoBuyHp: false, autoBuyMp: false, autoBuyWis: false, autoAttack: 'none', autoAttackMpThreshold: 0, autoBuffs: [], autoHealSpell: 'none', autoHealThreshold: 50 },
    currentMap: 'knight_village', targetMonsters: [null, null, null, null, null], targetMonster: null, selectedTargetIndex: 0,
    battleLoop: null, monsterLoop: null, magicLoop: null, regenLoop: null, tickLoop: null,
    potionCooldown: 0, autoHealCd: 0, enchantTargetKey: null, zombieTick: 0, monsterSpecialTick: 0, antarasDeadUntil: 0,
    currentForumTab: 'all',
    forumMessages: [
        { id: 1, author: '系統公告', tag: 'announce', content: '《天堂放置版v0.2.3 - 傳說巨龍篇》官方討論區正式開張！歡迎在此交流公會招募、交易物資及分享攻略。', time: '剛剛', likes: 45, laughs: 0, hearts: 68 },
        { id: 2, author: 'HanLin', tag: 'guide', content: '法師初期建議優先點智力(INT)跟精神(WIS)，魔攻跟魔力回復速度會差很多，4階的擬似魔武是近戰法必備！', time: '3分鐘前', likes: 18, laughs: 0, hearts: 12 },
        { id: 3, author: 'Amy', tag: 'guild', content: '【極道盟】招募熱血玩家！一起推王打寶，意者村莊右方會合！', time: '10分鐘前', likes: 9, laughs: 1, hearts: 15 },
        { id: 4, author: 'Tom', tag: 'trade', content: '出售 +7 瑪那魔杖，意者帶價，或換 +7 死亡騎士的烈炎之劍！', time: '15分鐘前', likes: 6, laughs: 2, hearts: 3 },
        { id: 5, author: 'GamerX', tag: 'bug', content: '回報：安塔瑞斯有時候重生時間過長，是否是設定問題？', time: '20分鐘前', likes: 4, laughs: 1, hearts: 2 },
        { id: 6, author: '系統管理員', tag: 'bug', content: '回覆 @GamerX：感謝回報，安塔瑞斯為終極BOSS，重生時間為擊殺後10分鐘，此為正常設定。', time: '18分鐘前', likes: 8, laughs: 0, hearts: 5 },
        { id: 7, author: 'HanLin', tag: 'general', content: '有人打龍嗎？', time: '30分鐘前', likes: 12, laughs: 0, hearts: 8 },
        { id: 8, author: 'Tom', tag: 'general', content: '+1', time: '29分鐘前', likes: 5, laughs: 0, hearts: 2 },
        { id: 9, author: 'Amy', tag: 'general', content: '我組隊', time: '28分鐘前', likes: 8, laughs: 0, hearts: 10 }
    ]
};

// Export save file as downloadable JSON
window.game.exportSave = function() {
    const saveData = {
        level: window.game.state.level, exp: window.game.state.exp, adena: window.game.state.adena,
        hp: window.game.state.hp, maxHp: window.game.state.maxHp, mp: window.game.state.mp, maxMp: window.game.state.maxMp,
        class: window.game.state.class, gender: window.game.state.gender,
        baseStats: window.game.state.baseStats, bonusPoints: window.game.state.bonusPoints,
        inventory: window.game.state.inventory, equipment: window.game.state.equipment, spells: window.game.state.spells,
        settings: window.game.state.settings, currentMap: window.game.state.currentMap, antarasDeadUntil: window.game.state.antarasDeadUntil
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "lineage_idle_save.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.game.logSystem('存檔已成功匯出下載！', 'reward');
};

// Import save file from local device
window.game.importSave = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.level && data.baseStats && data.inventory) {
                localStorage.setItem('lineageIdleSave', JSON.stringify(data));
                window.game.loadGame();
                window.game.logSystem('存檔已成功上傳匯入！', 'reward');
            } else {
                alert('無效的存檔檔案格式！');
            }
        } catch (err) {
            console.error(err);
            alert('解析存檔檔案失敗！');
        }
    };
    reader.readAsText(file);
};

// Update the 5 monster slots cards
window.game.updateMonsterSlotsUI = function() {
    for (let i = 0; i < 5; i++) {
        let m = window.game.state.targetMonsters[i];
        let card = document.getElementById(`monster-slot-${i}`);
        if (!card) continue;
        
        let nameEl = card.querySelector('.monster-name');
        let subEl = card.querySelector('.monster-subtitle');
        let avatarEl = card.querySelector('.monster-avatar');
        let barFill = card.querySelector('.hp-bar');
        let hpTextEl = card.querySelector('.monster-hp-text');
        
        if (m) {
            // Apply active threat classes
            card.classList.add('monster-slot-active');
            card.classList.remove('pointer-events-none');
            
            // If this slot is the currently selected active target by player, add selection gold border!
            if (window.game.state.selectedTargetIndex === i) {
                card.classList.add('monster-slot-selected');
            } else {
                card.classList.remove('monster-slot-selected');
            }
            
            // Name color by level difference
            let lvlDiff = m.level - window.game.state.level;
            let nameColor = 'text-green-400';
            if (lvlDiff <= -10) nameColor = 'text-zinc-500';
            else if (lvlDiff >= -9 && lvlDiff <= -5) nameColor = 'text-white';
            else if (lvlDiff >= 3 && lvlDiff <= 5) nameColor = 'text-yellow-400';
            else if (lvlDiff >= 6 && lvlDiff <= 9) nameColor = 'text-orange-500';
            else if (lvlDiff >= 10) nameColor = 'text-red-500';
            
            if (m.isBoss) {
                nameEl.innerText = `★ ${m.name} Lv.${m.level}`;
                nameEl.className = 'monster-name font-black tracking-wider text-shadow text-purple-400 text-xs truncate';
                subEl.innerHTML = `⚔️ BOSS 戰鬥中`;
            } else {
                nameEl.innerText = `${m.name} Lv.${m.level}`;
                nameEl.className = `monster-name font-black tracking-wider text-shadow ${nameColor} text-xs truncate`;
                subEl.innerHTML = `⚔️ 戰鬥進行中`;
            }
            
            // Avatar emoji
            if (m.id === 'antaras') avatarEl.innerText = '🐲';
            else if (m.id === 'wyrm') avatarEl.innerText = '🦖';
            else if (m.id === 'death_knight') avatarEl.innerText = '💀';
            else if (m.id === 'black_elder') avatarEl.innerText = '🧙';
            else if (m.isBoss) avatarEl.innerText = '👿';
            else avatarEl.innerText = '👹';
            
            let dbf = m.debuffs || {};
            if (dbf.sleep > 0) {
                subEl.innerHTML = `💤 沉睡中 (${dbf.sleep}s)`;
            } else if (dbf.slow > 0) {
                subEl.innerHTML = `⏳ 緩速中 (${dbf.slow}s)`;
            }
            
            let targetRatio = m.hp / m.maxHp;
            barFill.style.width = `${Math.max(0, targetRatio * 100)}%`;
            hpTextEl.innerText = `${Math.floor(m.hp)}/${m.maxHp}`;
        } else {
            // Empty slot
            card.classList.remove('monster-slot-active', 'monster-slot-selected');
            card.classList.add('pointer-events-none');
            
            nameEl.innerText = "搜尋中...";
            nameEl.className = "monster-name font-bold text-shadow text-xs truncate text-zinc-400";
            subEl.innerHTML = `🔍 搜尋魔物中`;
            avatarEl.innerText = '🔍';
            barFill.style.width = "0%";
            hpTextEl.innerText = "0/0";
        }
    }
};

// Select a monster card slot as current active target
window.game.selectTargetSlot = function(index) {
    if (window.game.state.targetMonsters[index]) {
        window.game.state.selectedTargetIndex = index;
        window.game.state.targetMonster = window.game.state.targetMonsters[index]; // backwards compatibility fallback
        window.game.updateMonsterSlotsUI();
        window.game.logSystem(`已鎖定目標: [Slot ${index + 1}] ${window.game.state.targetMonster.name}`);
    }
};


window.game.centerWindow = function(win) {
    let w = win.offsetWidth || parseInt(win.style.width) || 350;
    let h = win.offsetHeight || parseInt(win.style.height) || 400;
    
    // Constrain width and height to active browser viewport size
    const maxW = Math.floor(window.innerWidth * 0.95);
    const maxH = Math.floor(window.innerHeight * 0.85);
    
    if (w > maxW) {
        w = maxW;
        win.style.width = `${w}px`;
    }
    if (h > maxH) {
        h = maxH;
        win.style.height = `${h}px`;
    }
    
    const left = Math.max(10, Math.floor((window.innerWidth - w) / 2));
    const top = Math.max(10, Math.floor((window.innerHeight - h) / 2));
    
    win.style.transform = 'none';
    win.style.bottom = 'auto';
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
};

window.game.toggleWindow = function(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    if (win.classList.contains('hidden')) {
        win.classList.remove('hidden');
        if (!win.style.top && !win.style.left) {
            window.game.centerWindow(win);
        }
        window.game.bringToFront(win);
    } else {
        win.classList.add('hidden');
    }
};

window.game.bringToFront = function(win) {
    const windows = ['win-status', 'win-inventory', 'win-spells', 'win-shop', 'win-map', 'win-logs', 'win-forum', 'enchant-modal'];
    windows.forEach(id => {
        const w = document.getElementById(id);
        if (w) w.style.zIndex = "10";
    });
    win.style.zIndex = "25";
};

window.game.makeWindowsDraggable = function() {
    const windows = document.querySelectorAll('.game-window');
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        if (!header) return;
        
        header.style.cursor = 'move';
        header.addEventListener('mousedown', dragStart);
        header.addEventListener('touchstart', dragStart, { passive: true });
        
        let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
        
        function dragStart(e) {
            if (e.target.closest('button') || e.target.closest('i') || e.target.closest('input') || e.target.closest('select')) return;
            
            window.game.bringToFront(win);
            
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            mouseX = clientX;
            mouseY = clientY;
            
            document.body.style.userSelect = 'none';
            
            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', dragMove);
                document.addEventListener('mouseup', dragEnd);
            } else {
                document.addEventListener('touchmove', dragMove, { passive: false });
                document.addEventListener('touchend', dragEnd);
            }
        }
        
        function dragMove(e) {
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            if (e.type === 'touchmove') e.preventDefault();
            
            posX = mouseX - clientX;
            posY = mouseY - clientY;
            mouseX = clientX;
            mouseY = clientY;
            
            let newTop = win.offsetTop - posY;
            let newLeft = win.offsetLeft - posX;
            
            const minVisibleX = 50;
            const minVisibleY = 30;
            
            if (newLeft < -win.offsetWidth + minVisibleX) newLeft = -win.offsetWidth + minVisibleX;
            if (newLeft > window.innerWidth - minVisibleX) newLeft = window.innerWidth - minVisibleX;
            if (newTop < 0) newTop = 0;
            if (newTop > window.innerHeight - minVisibleY) newTop = window.innerHeight - minVisibleY;
            
            win.style.bottom = 'auto';
            win.style.transform = 'none';
            win.style.top = `${newTop}px`;
            win.style.left = `${newLeft}px`;
        }
        
        function dragEnd() {
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('touchend', dragEnd);
        }

        // Top-left corner drag-to-resize support via the resize icon
        const resizeIcon = win.querySelector('.fa-arrows-alt');
        if (resizeIcon) {
            resizeIcon.addEventListener('mousedown', resizeStart);
            resizeIcon.addEventListener('touchstart', resizeStart, { passive: true });
            
            let startWidth = 0, startHeight = 0, startLeft = 0, startTop = 0;
            let startMouseX = 0, startMouseY = 0;
            
            function resizeStart(e) {
                e.stopPropagation(); // Stop window dragging trigger
                window.game.bringToFront(win);
                
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                
                startMouseX = clientX;
                startMouseY = clientY;
                startWidth = win.offsetWidth;
                startHeight = win.offsetHeight;
                startLeft = win.offsetLeft;
                startTop = win.offsetTop;
                
                document.body.style.userSelect = 'none';
                
                if (e.type === 'mousedown') {
                    document.addEventListener('mousemove', resizeMove);
                    document.addEventListener('mouseup', resizeEnd);
                } else {
                    document.addEventListener('touchmove', resizeMove, { passive: false });
                    document.addEventListener('touchend', resizeEnd);
                }
            }
            
            function resizeMove(e) {
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                if (e.type === 'touchmove') e.preventDefault();
                
                let dx = clientX - startMouseX;
                let dy = clientY - startMouseY;
                
                let newWidth = startWidth - dx;
                let newHeight = startHeight - dy;
                
                const minW = 250;
                const minH = 150;
                
                if (newWidth < minW) {
                    newWidth = minW;
                    dx = startWidth - minW;
                }
                if (newHeight < minH) {
                    newHeight = minH;
                    dy = startHeight - minH;
                }
                
                let newLeft = startLeft + dx;
                let newTop = startTop + dy;
                
                if (newTop < 0) {
                    newTop = 0;
                    dy = -startTop;
                    newHeight = startHeight - dy;
                }
                
                win.style.transform = 'none';
                win.style.bottom = 'auto';
                win.style.width = `${newWidth}px`;
                win.style.height = `${newHeight}px`;
                win.style.left = `${newLeft}px`;
                win.style.top = `${newTop}px`;
            }
            
            function resizeEnd() {
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', resizeMove);
                document.removeEventListener('mouseup', resizeEnd);
                document.removeEventListener('touchmove', resizeMove);
                document.removeEventListener('touchend', resizeEnd);
            }
        }
    });
};

window.game.switchLogTab = function(tab) {
    const sysBtn = document.getElementById('tab-log-sys-btn');
    const combatBtn = document.getElementById('tab-log-combat-btn');
    const sysLog = document.getElementById('win-system-log');
    const combatLog = document.getElementById('win-combat-log');
    
    if (tab === 'sys') {
        sysBtn.className = 'flex-1 py-1.5 bg-black/40 text-[#fbbf24] font-bold border-r border-zinc-800';
        combatBtn.className = 'flex-1 py-1.5 bg-[#0f121a]/80 text-gray-500 font-bold';
        sysLog.classList.remove('hidden');
        combatLog.classList.add('hidden');
    } else {
        combatBtn.className = 'flex-1 py-1.5 bg-black/40 text-[#fbbf24] font-bold border-l border-zinc-800';
        sysBtn.className = 'flex-1 py-1.5 bg-[#0f121a]/80 text-gray-500 font-bold border-r border-zinc-800';
        sysLog.classList.add('hidden');
        combatLog.classList.remove('hidden');
    }
};

window.game.switchForumTab = function(tab) {
    window.game.state.currentForumTab = tab;
    
    const tabsContainer = document.getElementById('forum-tabs');
    if (tabsContainer) {
        const buttons = tabsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            const btnTab = btn.getAttribute('data-tab');
            if (btnTab === tab) {
                btn.className = 'flex-1 py-2 px-1 text-center bg-[#1a202c]/50 text-[#fbbf24] font-bold border-r border-zinc-800 hover:text-yellow-400 border-t-2 border-t-yellow-500';
            } else {
                btn.className = 'flex-1 py-2 px-1 text-center bg-[#10141f]/80 text-gray-400 font-bold border-r border-zinc-800 hover:text-yellow-400 border-t-2 border-t-transparent';
            }
        });
    }
    
    window.game.renderForumMessages();
};

window.game.postForumMessage = function() {
    const nickEl = document.getElementById('forum-nickname-input');
    const tagEl = document.getElementById('forum-tag-select');
    const msgEl = document.getElementById('forum-message-input');
    if (!nickEl || !tagEl || !msgEl) return;
    
    let nick = nickEl.value.trim() || '無名冒險者';
    let tag = tagEl.value;
    let msg = msgEl.value.trim();
    
    if (!msg) return;
    
    const newId = window.game.state.forumMessages.length > 0 ? Math.max(...window.game.state.forumMessages.map(m => m.id)) + 1 : 1;
    window.game.state.forumMessages.unshift({
        id: newId,
        author: nick,
        tag: tag,
        content: msg,
        time: '剛剛',
        likes: 0,
        laughs: 0,
        hearts: 0
    });
    
    msgEl.value = '';
    window.game.renderForumMessages();
};

window.game.reactToForumMessage = function(msgId, reactionType) {
    const msg = window.game.state.forumMessages.find(m => m.id === msgId);
    if (msg && msg[reactionType] !== undefined) {
        msg[reactionType]++;
        window.game.renderForumMessages();
    }
};

window.game.renderForumMessages = function() {
    const container = document.getElementById('forum-messages-container');
    if (!container) return;
    
    let filtered = window.game.state.forumMessages;
    if (window.game.state.currentForumTab !== 'all') {
        filtered = window.game.state.forumMessages.filter(m => m.tag === window.game.state.currentForumTab);
    }
    
    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = '<div class="c-sys text-center py-6 text-xs italic">尚無相關主題留言。</div>';
        return;
    }
    
    const badgeColors = {
        announce: 'text-amber-400 bg-amber-950/20 border-amber-700/50',
        guild: 'text-green-400 bg-green-950/20 border-green-700/50',
        trade: 'text-purple-400 bg-purple-950/20 border-purple-700/50',
        guide: 'text-sky-400 bg-sky-950/20 border-sky-700/50',
        bug: 'text-red-400 bg-red-950/20 border-red-700/50',
        general: 'text-zinc-400 bg-zinc-900 border-zinc-700'
    };
    const badgeTexts = {
        announce: '📢 公告',
        guild: '⚔️ 招募',
        trade: '💰 交易',
        guide: '📖 攻略',
        bug: '🐞 Bug',
        general: '💬 留言'
    };
    
    filtered.forEach(m => {
        let badgeClass = badgeColors[m.tag] || badgeColors.general;
        let badgeText = badgeTexts[m.tag] || badgeTexts.general;
        
        let html = `
            <div class="p-2.5 bg-black/45 border border-zinc-800 rounded flex flex-col gap-2 hover:border-zinc-700 transition-colors">
                <div class="flex justify-between items-center text-xs">
                    <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] border font-bold ${badgeClass}">${badgeText}</span>
                        <span class="font-bold text-yellow-500/90">${m.author}</span>
                    </div>
                    <span class="text-zinc-500 scale-90">${m.time}</span>
                </div>
                <div class="text-xs text-zinc-100 leading-relaxed font-sans">${m.content}</div>
                <div class="flex gap-2 text-xs border-t border-zinc-800/40 pt-1.5 mt-0.5 justify-end">
                    <button class="px-2 py-0.5 rounded bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/60 active:scale-110 transition-transform flex items-center gap-1 text-[10px] text-zinc-300 font-sans" onclick="game.reactToForumMessage(${m.id}, 'likes')">👍 ${m.likes}</button>
                    <button class="px-2 py-0.5 rounded bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/60 active:scale-110 transition-transform flex items-center gap-1 text-[10px] text-zinc-300 font-sans" onclick="game.reactToForumMessage(${m.id}, 'laughs')">😂 ${m.laughs}</button>
                    <button class="px-2 py-0.5 rounded bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/60 active:scale-110 transition-transform flex items-center gap-1 text-[10px] text-zinc-300 font-sans" onclick="game.reactToForumMessage(${m.id}, 'hearts')">❤️ ${m.hearts}</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
};

// Floating damage number generator
window.game.spawnFloatingDamage = function(amount, type) {
    const container = document.getElementById('damage-container');
    if (!container) return;
    
    const el = document.createElement('div');
    el.className = `damage-number ${type === 'player' ? 'damage-player' : (type === 'monster' ? 'damage-monster' : (type === 'heal' ? 'damage-heal' : 'damage-magic'))}`;
    
    const xOffset = Math.floor(Math.random() * 60) - 30;
    const yOffset = Math.floor(Math.random() * 20) - 10;
    el.style.left = `${container.clientWidth / 2 - 10 + xOffset}px`;
    el.style.top = `${container.clientHeight / 2 - 20 + yOffset}px`;
    el.innerText = amount;
    
    container.appendChild(el);
    setTimeout(() => el.remove(), 1000);
};

window.game.appendMiniLog = function(msg, icon, colorClass) {
    const el = document.getElementById('mini-log-area');
    if (!el) return;
    el.insertAdjacentHTML('beforeend', `<div class="${colorClass} py-0.5 border-b border-zinc-950/10 flex items-start gap-1"><span class="flex-shrink-0">${icon}</span><span class="flex-1">${msg}</span></div>`);
    el.scrollTop = el.scrollHeight;
    if (el.children.length > 20) el.firstChild.remove();
};

window.game.logCombat = function(msg, type='normal') {
    const el = document.getElementById('win-combat-log');
    let color = 'c-sys';
    let icon = '🔹';
    if (type === 'danger') { color = 'c-err'; icon = '🩸'; }
    else if (type === 'hit') { color = 'c-info'; icon = '🗡️'; }
    else if (type === 'success') { color = 'c-success'; icon = '🛡️'; }
    else if (type === 'magic') { color = 'c-magic'; icon = '⚡'; }
    
    if (el) {
        el.insertAdjacentHTML('beforeend', `<div class="${color} py-0.5 border-b border-zinc-900/30 flex items-start gap-1"><span class="flex-shrink-0">${icon}</span><span class="flex-1">${msg}</span></div>`);
        el.scrollTop = el.scrollHeight;
        if(el.children.length > 50) el.firstChild.remove();
    }
    
    window.game.appendMiniLog(msg, icon, color);
    
    if (type === 'hit') {
        let match = msg.match(/造成\s*(\d+)\s*點傷害/);
        if (match) window.game.spawnFloatingDamage(match[1], 'player');
    } else if (type === 'danger') {
        let match = msg.match(/造成\s*(\d+)\s*點傷害/);
        if (match) window.game.spawnFloatingDamage(match[1], 'monster');
    } else if (type === 'magic') {
        let match = msg.match(/造成\s*(\d+)\s*點傷害/);
        if (match) window.game.spawnFloatingDamage(match[1], 'magic');
    } else if (msg.includes('恢復') || msg.includes('治癒')) {
        let match = msg.match(/恢復了\s*(\d+)\s*點體力/);
        if (match) window.game.spawnFloatingDamage(match[1], 'heal');
    }
};

window.game.logSystem = function(msg, type='normal') {
    const el = document.getElementById('win-system-log');
    let color = 'c-sys';
    let icon = '📢';
    if (type === 'danger') { color = 'c-err'; icon = '💀'; }
    else if (type === 'reward') { color = 'c-success'; icon = '🪙'; }
    else if (type === 'blessed') { color = 'c-blessed'; icon = '✨'; }
    else if (type === 'enchant-success') { color = 'c-enchant-success'; icon = '⭐'; }
    
    if (el) {
        el.insertAdjacentHTML('beforeend', `<div class="${color} py-0.5 border-b border-zinc-900/30 flex items-start gap-1"><span class="flex-shrink-0">${icon}</span><span class="flex-1">${msg}</span></div>`);
        el.scrollTop = el.scrollHeight;
        if(el.children.length > 50) el.firstChild.remove();
    }
    
    window.game.appendMiniLog(msg, icon, color);
};

window.game.getItemColorClass = function(item, def) {
    if (!item || !def) return 'c-item';
    if (def.legendary && Number(item.enchant) < 4) return 'c-legendary';
    if (item.isBlessed || def.isBlessed) return 'c-blessed';
    if (def.type === 'potion_hp') {
        if (item.itemId === 'potion_red') return 'c-potion-red';
        if (item.itemId === 'potion_orange') return 'c-potion-orange';
        if (item.itemId === 'potion_clear') return 'c-potion-white';
    }
    if (item.itemId === 'potion_blue') return 'c-potion-blue';
    if (item.itemId === 'potion_wisdom') return 'c-potion-purple';
    
    let isEquip = ['weapon','helmet','armor','shield','cloak','boots','leggings','gloves','amulet','earring','belt','ring'].includes(def.type);
    if (isEquip) {
        let safeLimit = def.safe !== undefined ? def.safe : 0;
        let overEnchant = Number(item.enchant) - safeLimit;
        if (overEnchant >= 4) return 'c-over-4';
        if (overEnchant === 3) return 'c-over-3';
        if (overEnchant === 2) return 'c-over-2';
        if (overEnchant === 1) return 'c-over-1';
    }
    if (Number(item.enchant) > 0) return 'c-enchant';
    return 'c-item';
};

window.game.getDisplayName = function(item, def) {
    if (!def) return '未知物品';
    let name = def.name;
    if (def.isUndeadSlayer) name += ' (不死加成)';
    if (item.isBlessed && !def.isBlessed) name = '受祝福的 ' + name;
    if (item.enchant > 0) name = `+${item.enchant} ` + name;
    return name;
};

window.game.showItemDetail = function(itemKey) {
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    if(!def) return;

    let displayName = window.game.getDisplayName(item, def);
    let colorClass = window.game.getItemColorClass(item, def);
    
    document.getElementById('detail-name').innerText = displayName;
    document.getElementById('detail-name').className = `text-2xl font-bold mb-3 border-b border-gray-700 pb-2 ${colorClass}`;
    
    let html = '';
    let typeName = '';
    if(def.type === 'weapon') typeName = '武器';
    else if(def.type === 'helmet') typeName = '頭盔';
    else if(def.type === 'armor') typeName = '盔甲';
    else if(def.type === 'shield') typeName = '盾牌';
    else if(def.type === 'cloak') typeName = '斗篷';
    else if(def.type === 'boots') typeName = '靴子';
    else if(def.type === 'belt') typeName = '腰帶';
    else if(def.type === 'amulet') typeName = '項鍊';
    else if(def.type === 'ring') typeName = '戒指';
    else if(def.type === 'gloves') typeName = '手套';
    
    if (typeName) html += `<div class="c-sys mb-2">[${typeName}]</div>`;

    if (def.type === 'weapon') {
        let baseAttack = def.dice ? def.dice.toLowerCase().split('d')[1] : 0;
        html += `<div>攻擊力: <span class="text-white">${baseAttack}</span></div>`;
        html += `<div>安定值: <span class="text-white">${def.safe !== undefined ? def.safe : 0}</span></div>`;
        if (def.hit) html += `<div>額外命中: <span class="text-white">+${def.hit}</span></div>`;
        if (def.mDmg) html += `<div>魔法額外傷害: <span class="text-white">+${def.mDmg}</span></div>`;
        if (def.isUndeadSlayer) html += `<div class="c-info mt-1">對不死族與狼人族造成 3~6 點額外傷害</div>`;
    } else if (['helmet','armor','shield','cloak','boots','leggings','gloves','amulet','earring','belt','ring'].includes(def.type)) {
        if (def.ac !== undefined && def.ac !== 0) html += `<div>防禦力 (AC): <span class="text-white">${def.ac}</span></div>`;
        if (def.safe !== undefined) html += `<div>安定值: <span class="text-white">${def.safe !== undefined ? def.safe : 0}</span></div>`;
        if (def.mr) html += `<div>魔防 (MR): <span class="text-white">+${def.mr}%</span></div>`;
    }
    
    if (def.desc) html += `<div class="c-warn mt-3 text-base">${def.desc}</div>`;
    
    document.getElementById('detail-content').innerHTML = html;
    document.getElementById('item-detail-modal').classList.remove('hidden');
};

window.game.closeItemDetail = function() {
    document.getElementById('item-detail-modal').classList.add('hidden');
};

window.game.getItemKey = function(itemId, enchant, isBlessed = false) {
    return `${itemId}_${enchant}_${isBlessed}`;
};

window.game.addInventory = function(itemId, count, enchant = 0, isBlessed = false) {
    let def = window.ITEMS[itemId];
    if(!def) return;
    if (def.unique) {
        for (let k in window.game.state.inventory) { if (window.game.state.inventory[k].itemId === itemId) return; }
    }
    let key = window.game.getItemKey(itemId, enchant, isBlessed);
    if(window.game.state.inventory[key]) window.game.state.inventory[key].count += count;
    else window.game.state.inventory[key] = { itemId: itemId, enchant: Number(enchant), count: count, isBlessed: isBlessed };
    if(!window.game.state.isPlaying) return;
    window.game.renderInventory();
};

window.game.removeInventory = function(itemKey, count) {
    if(window.game.state.inventory[itemKey]) {
        window.game.state.inventory[itemKey].count -= count;
        if(window.game.state.inventory[itemKey].count <= 0) {
            for(let slot in window.game.state.equipment) {
                if(window.game.state.equipment[slot] === itemKey) window.game.state.equipment[slot] = null;
            }
            delete window.game.state.inventory[itemKey];
        }
        window.game.renderInventory();
        window.game.updateUI();
    }
};

window.game.sellItem = function(itemKey, price) {
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    window.game.removeInventory(itemKey, 1);
    window.game.state.adena += price;
    window.game.logSystem(`賣出了 ${window.game.getDisplayName(item, def)}，獲得 ${price} 金幣。`, 'reward');
    window.game.updateUI();
};

window.game.buyItem = function(itemId) {
    let def = window.ITEMS[itemId];
    if(window.game.state.adena >= def.price) {
        window.game.state.adena -= def.price;
        window.game.addInventory(itemId, 1, 0, false); 
        window.game.logSystem(`購買了 ${def.name}。`);
        window.game.updateUI();
    } else window.game.logSystem(`金幣不足，無法購買 ${def.name}。`, 'danger');
};

window.game.openEnchantModal = function(itemKey) {
    let item = window.game.state.inventory[itemKey];
    if(!item) return;
    let def = window.ITEMS[item.itemId];
    
    window.game.state.enchantTargetKey = itemKey;
    let displayName = window.game.getDisplayName(item, def);
    let colorClass = window.game.getItemColorClass(item, def);
    
    document.getElementById('enchant-target-name').innerText = displayName;
    document.getElementById('enchant-target-name').className = `font-bold text-xl ${colorClass}`;
    
    let scrollList = document.getElementById('enchant-scroll-list');
    scrollList.innerHTML = '';
    
    let targetType = def.type === 'weapon' ? 'weapon' : (['belt','amulet','ring','earring'].includes(def.type) ? 'accessory' : 'armor');
    let foundScrolls = false;

    for(let key in window.game.state.inventory) {
        let sItem = window.game.state.inventory[key];
        let sDef = window.ITEMS[sItem.itemId];
        if(sDef && sDef.type === 'scroll' && sDef.target === targetType) {
            foundScrolls = true;
            let sColorClass = window.game.getItemColorClass(sItem, sDef);
            scrollList.insertAdjacentHTML('beforeend', `
                <div class="list-item bg-gray-900 rounded p-2 border border-gray-700">
                    <span class="text-lg ${sColorClass}">${sDef.name} <span class="c-sys">x${sItem.count}</span></span>
                    <button class="btn-ui c-info border-blue-700" onclick="game.doEnchant('${key}')">使用</button>
                </div>
            `);
        }
    }
    if(!foundScrolls) scrollList.innerHTML = `<div class="c-sys italic p-2 text-sm">背包中沒有可用的強化卷軸。</div>`;
    
    const win = document.getElementById('enchant-modal');
    if (win) {
        win.classList.remove('hidden');
        if (!win.style.top && !win.style.left) {
            window.game.centerWindow(win);
        }
        window.game.bringToFront(win);
    }
};

window.game.closeEnchantModal = function() {
    window.game.state.enchantTargetKey = null;
    document.getElementById('enchant-modal').classList.add('hidden');
};

window.game.doEnchant = function(scrollKey) {
    let itemKey = window.game.state.enchantTargetKey;
    let item = window.game.state.inventory[itemKey];
    let scroll = window.game.state.inventory[scrollKey];
    
    if(!item || !scroll) { window.game.closeEnchantModal(); return; }
    
    let itemDef = window.ITEMS[item.itemId];
    let isWeapon = itemDef.type === 'weapon';
    let safeLimit = itemDef.safe !== undefined ? itemDef.safe : 0;
    let isBlessed = window.ITEMS[scroll.itemId].isBlessed;
    let currentEnchant = Number(item.enchant); 
    
    let success = false, noChange = false;
    if(currentEnchant < safeLimit) success = true;
    else {
        if(isWeapon) {
            if(currentEnchant >= 9) {
                let r = Math.random() * 6;
                if(r < 1) success = true; else if(r < 2) noChange = true;
            } else if(Math.random() < Number(1/3)) success = true;
        } else {
            let den = currentEnchant === 0 ? (safeLimit === 0 ? 2 : 1) : (safeLimit === 0 ? currentEnchant * 2 : currentEnchant);
            if(Math.random() < Number(1/den)) success = true;
        }
    }
    
    let wasEquipped = false, slotName = '';
    for(let slot in window.game.state.equipment) {
        if(window.game.state.equipment[slot] === itemKey) { wasEquipped = true; slotName = slot; break; }
    }

    window.game.removeInventory(scrollKey, 1);
    let nameBefore = window.game.getDisplayName(item, itemDef);

    if(success) {
        let boost = 1;
        if(isBlessed) {
            let r = Math.random();
            if(r < 0.33) boost = 3; else if(r < 0.66) boost = 2;
        }
        
        window.game.removeInventory(itemKey, 1); 
        window.game.addInventory(item.itemId, 1, currentEnchant + boost, item.isBlessed); 
        if(wasEquipped) window.game.state.equipment[slotName] = window.game.getItemKey(item.itemId, currentEnchant + boost, item.isBlessed);

        let nameAfter = window.game.getDisplayName({enchant: currentEnchant + boost, isBlessed: item.isBlessed}, itemDef);
        window.game.logSystem(`${nameAfter} 持續發出銀色的光芒。`, 'enchant-success');
    } else if(noChange) {
        window.game.logSystem(`${nameBefore} 發出微弱銀色的光芒，沒有任何變化。`);
    } else {
        window.game.logSystem(`${nameBefore} 強烈的發出 銀色的光芒就消失了。`, 'danger');
        window.game.removeInventory(itemKey, 1); 
    }
    window.game.closeEnchantModal();
    window.game.updateUI();
    window.game.renderInventory();
};

window.game.updateUI = function() {
    if (document.getElementById('ui-level-bottom')) document.getElementById('ui-level-bottom').innerText = window.game.state.level;
    if (document.getElementById('win-status-level')) document.getElementById('win-status-level').innerText = window.game.state.level;
    
    let reqExp = window.EXP_TABLE[window.game.state.level] || 36065092;
    let expPct = ((window.game.state.exp/reqExp)*100).toFixed(2);
    
    if (document.getElementById('ui-exp-bottom')) document.getElementById('ui-exp-bottom').innerText = `${expPct}%`;
    if (document.getElementById('ui-exp-bar-bottom')) document.getElementById('ui-exp-bar-bottom').style.width = `${Math.min(100, parseFloat(expPct))}%`;
    if (document.getElementById('win-exp-bar')) document.getElementById('win-exp-bar').style.width = `${Math.min(100, expPct)}%`;
    if (document.getElementById('win-exp-text')) document.getElementById('win-exp-text').innerText = `${expPct}%`;

    let hpRatio = window.game.state.hp / window.game.state.maxHp;
    
    let hpBarBottom = document.getElementById('ui-hp-bar-bottom');
    if (hpBarBottom) {
        hpBarBottom.style.width = `${Math.max(0, hpRatio * 100)}%`;
        if (hpRatio <= 0.3) hpBarBottom.parentElement.classList.add('hp-low-breathing');
        else hpBarBottom.parentElement.classList.remove('hp-low-breathing');
    }
    if (document.getElementById('ui-hp-text-bottom')) {
        document.getElementById('ui-hp-text-bottom').innerText = `HP ${Math.floor(window.game.state.hp)}/${window.game.state.maxHp}`;
    }
    
    if (document.getElementById('win-hp-bar')) document.getElementById('win-hp-bar').style.width = `${Math.max(0, hpRatio * 100)}%`;
    if (document.getElementById('win-hp-text')) document.getElementById('win-hp-text').innerText = `${Math.floor(window.game.state.hp)}/${window.game.state.maxHp}`;

    if (document.getElementById('ui-mp-bar-bottom')) {
        document.getElementById('ui-mp-bar-bottom').style.width = `${Math.max(0, (window.game.state.mp/window.game.state.maxMp)*100)}%`;
    }
    if (document.getElementById('ui-mp-text-bottom')) {
        document.getElementById('ui-mp-text-bottom').innerText = `MP ${Math.floor(window.game.state.mp)}/${window.game.state.maxMp}`;
    }
    
    if (document.getElementById('win-mp-bar')) document.getElementById('win-mp-bar').style.width = `${Math.max(0, (window.game.state.mp/window.game.state.maxMp)*100)}%`;
    if (document.getElementById('win-mp-text')) document.getElementById('win-mp-text').innerText = `${Math.floor(window.game.state.mp)}/${window.game.state.maxMp}`;

    let adenaStr = window.game.state.adena.toLocaleString();
    if (document.getElementById('ui-adena-bottom')) document.getElementById('ui-adena-bottom').innerText = adenaStr;
    if (document.getElementById('win-adena')) document.getElementById('win-adena').innerText = adenaStr;

    if (document.getElementById('win-str')) document.getElementById('win-str').innerText = window.game.getEffStat('str') + (window.game.state.buffs.str_buff ? ' (+5)' : '');
    if (document.getElementById('win-dex')) document.getElementById('win-dex').innerText = window.game.getEffStat('dex') + (window.game.state.buffs.dex_buff ? ' (+5)' : '');
    if (document.getElementById('win-con')) document.getElementById('win-con').innerText = window.game.getEffStat('con');
    if (document.getElementById('win-int')) document.getElementById('win-int').innerText = window.game.getEffStat('int');
    if (document.getElementById('win-wis')) document.getElementById('win-wis').innerText = window.game.getEffStat('wis');
    if (document.getElementById('win-cha')) document.getElementById('win-cha').innerText = window.game.getEffStat('cha');
    
    let classNameMap = {
        prince: '王族', knight: '騎士', elf: '妖精', mage: '法師', dark_elf: '黑妖', dragon_knight: '龍騎士', illusionist: '幻術師'
    };
    if (document.getElementById('win-status-class-title')) {
        document.getElementById('win-status-class-title').innerText = classNameMap[window.game.state.class] || '王族';
    }
    
    let acVal = window.game.getAC();
    if (document.getElementById('ui-ac-bottom')) document.getElementById('ui-ac-bottom').innerText = acVal;
    if (document.getElementById('win-ac')) document.getElementById('win-ac').innerText = acVal;
    
    let mrStr = window.game.getMR() + '%';
    if (document.getElementById('ui-mr-bottom')) document.getElementById('ui-mr-bottom').innerText = mrStr;
    if (document.getElementById('win-mr')) document.getElementById('win-mr').innerText = mrStr;
    
    let erVal = window.game.getER();
    if (document.getElementById('ui-er-bottom')) document.getElementById('ui-er-bottom').innerText = erVal;
    if (document.getElementById('win-er')) document.getElementById('win-er').innerText = erVal;
    
    let dmgVal = window.game.getMeleeDmg();
    let dmgStr = dmgVal >= 0 ? `+${dmgVal}` : dmgVal;
    if (document.getElementById('ui-dmg-bottom')) document.getElementById('ui-dmg-bottom').innerText = dmgStr;
    if (document.getElementById('win-dmg')) document.getElementById('win-dmg').innerText = dmgStr;
    
    let hitVal = window.game.getMeleeHit();
    let hitStr = hitVal >= 0 ? `+${hitVal}` : hitVal;
    if (document.getElementById('win-hit')) document.getElementById('win-hit').innerText = hitStr;

    let buffHtml = '';
    let sets = window.game.getSetBonuses();
    if (sets.active.length > 0) sets.active.forEach(sName => { buffHtml += `<span class="c-legendary mr-2">[${sName}]</span>`; });
    if(window.game.state.buffs.dex_buff) buffHtml += '<span class="c-success mr-2">[通暢氣脈]</span>';
    if(window.game.state.buffs.str_buff) buffHtml += '<span class="c-success mr-2">[體魄強健]</span>';
    if(window.game.state.buffs.enchant_weapon) buffHtml += '<span class="c-success mr-2">[擬似魔武]</span>';
    if(window.game.state.buffs.haste) buffHtml += '<span class="c-success mr-2">[加速術]</span>';
    if(window.game.state.buffs.greater_haste) buffHtml += '<span class="c-success mr-2">[強力加速]</span>';
    if(window.game.state.buffs.shield) buffHtml += '<span class="c-info mr-2">[保護罩]</span>';
    if(window.game.state.buffs.immune_to_harm) buffHtml += '<span class="c-warn mr-2">[聖結界]</span>';
    if(window.game.state.buffs.berserkers) buffHtml += '<span class="c-err mr-2">[狂暴術]</span>';
    if(window.game.state.buffs.create_zombie) buffHtml += '<span class="c-warn mr-2">[隨從:殭屍]</span>';
    if(window.game.state.buffs.summon_ogre) buffHtml += '<span class="c-warn mr-2">[隨從:食妖]</span>';
    if(window.game.state.buffs.tame_monster) buffHtml += '<span class="c-warn mr-2">[迷魅術]</span>';
    if(window.game.state.buffs.potion_blue) buffHtml += '<span class="c-potion-blue mr-2">[藍色藥水]</span>';
    if(window.game.state.buffs.potion_wisdom) buffHtml += '<span class="c-potion-purple mr-2">[慎重藥水]</span>';
    if(window.game.state.buffs.player_weapon_break) buffHtml += '<span class="c-err mr-2">[武器受損]</span>';
    if(window.game.state.buffs.poison_storm) buffHtml += '<span class="c-err mr-2">[毒氣風暴]</span>';
    if(window.game.state.buffs.petrified) buffHtml += '<span class="c-err mr-2">[石化]</span>';
    if(window.game.state.buffs.heal_erosion) buffHtml += '<span class="c-err mr-2">[治癒侵蝕]</span>';
    if(window.game.state.buffs.stun) buffHtml += '<span class="c-err mr-2">[衝暈]</span>';
    
    let winBuffsEl = document.getElementById('win-buffs');
    if (winBuffsEl) winBuffsEl.innerHTML = buffHtml || '無附加狀態';

    // Update the 5 monster slots cards
    window.game.updateMonsterSlotsUI();

    let type = window.game.state.settings.autoHpType || 'potion_red';
    let count = 0;
    for(let k in window.game.state.inventory) {
        if(window.game.state.inventory[k].itemId === type) {
            count = window.game.state.inventory[k].count;
            break;
        }
    }
    
    let pCountEl = document.getElementById('quick-potion-count');
    if (pCountEl) {
        pCountEl.innerText = `x${count}`;
        let flaskEl = pCountEl.previousElementSibling;
        if (flaskEl) {
            flaskEl.className = `fas fa-flask text-lg mt-1 ${type === 'potion_red' ? 'text-red-500' : (type === 'potion_orange' ? 'text-orange-500' : 'text-slate-100')}`;
        }
    }

    let sId = window.game.state.settings.autoAttack;
    let spellNameEl = document.getElementById('quick-attack-spell-name');
    let spellIconEl = document.getElementById('quick-attack-spell-icon');
    
    if (spellNameEl && spellIconEl) {
        if (sId !== 'none' && window.SPELLS[sId]) {
            spellNameEl.innerText = window.SPELLS[sId].name;
            spellIconEl.className = 'fas fa-bolt text-[#38bdf8] text-lg mt-1';
        } else {
            spellNameEl.innerText = '無';
            spellIconEl.className = 'fas fa-bolt text-gray-700 text-lg mt-1';
        }
    }
};

window.game.updateSettingsUI = function() {
    let atkSel = document.getElementById('win-cfg-auto-attack');
    let healSel = document.getElementById('win-cfg-heal-spell');
    let availSpells = window.game.getAvailableSpells();
    let currentAtk = window.game.state.settings.autoAttack;
    atkSel.innerHTML = '<option value="none">無 (純物理攻擊)</option>';
    availSpells.forEach(id => {
        let sp = window.SPELLS[id];
        if(!sp) return;
        if(sp.type === 'attack' && window.canCastSpell(sp.level, window.game.state.level)) atkSel.innerHTML += `<option value="${id}">${sp.name}</option>`;
    });
    if (Array.from(atkSel.options).some(opt => opt.value === currentAtk)) atkSel.value = currentAtk;
    else { atkSel.value = 'none'; window.game.state.settings.autoAttack = 'none'; }
    
    let currentHeal = window.game.state.settings.autoHealSpell;
    healSel.innerHTML = '<option value="none">無</option>';
    availSpells.forEach(id => {
        let sp = window.SPELLS[id];
        if(!sp) return;
        if(sp.type === 'heal' && window.canCastSpell(sp.level, window.game.state.level)) healSel.innerHTML += `<option value="${id}">${sp.name}</option>`;
    });
    if (Array.from(healSel.options).some(opt => opt.value === currentHeal)) healSel.value = currentHeal;
    else { healSel.value = 'none'; window.game.state.settings.autoHealSpell = 'none'; }
    
    document.getElementById('win-max-spell-lv').innerText = window.getChineseNumber(Math.max(1, Math.floor(window.game.state.level/4)));
};

window.game.updateSettings = function() {
    window.game.state.settings.autoHpThreshold = parseInt(document.getElementById('win-cfg-hp-threshold').value) || 5;
    window.game.state.settings.autoHpType = document.getElementById('win-cfg-hp-type').value;
    window.game.state.settings.autoBuyHp = document.getElementById('win-cfg-auto-buy').checked;
    window.game.state.settings.autoBuyMp = document.getElementById('win-cfg-auto-mp').checked;
    window.game.state.settings.autoBuyWis = document.getElementById('win-cfg-auto-wis').checked;
    window.game.state.settings.autoAttack = document.getElementById('win-cfg-auto-attack').value;
    window.game.state.settings.autoHealThreshold = parseInt(document.getElementById('win-cfg-heal-threshold').value) || 50;
    window.game.state.settings.autoHealSpell = document.getElementById('win-cfg-heal-spell').value;
    window.game.state.settings.autoAttackMpThreshold = parseInt(document.getElementById('win-cfg-auto-attack-mp').value) || 0;
    window.game.updateUI();
};

window.game.toggleAutoBuff = function(spellId, isChecked) {
    if(isChecked) { if(!window.game.state.settings.autoBuffs.includes(spellId)) window.game.state.settings.autoBuffs.push(spellId); }
    else window.game.state.settings.autoBuffs = window.game.state.settings.autoBuffs.filter(id => id !== spellId);
};

window.game.getSpellCost = function(spell) {
    let int = window.game.getEffStat('int');
    let reduction = 0;
    if(int>=13 && spell.level>=2) {
        if(int===13) reduction = 1;
        else if(int===14) reduction = spell.level>=3 ? 2 : 1;
        else if(int===15) reduction = spell.level>=4 ? 3 : (spell.level===3?2:1);
        else if(int>=16) reduction = spell.level; 
    }
    return Math.max(1, spell.mp - reduction);
};

window.game.renderSkills = function() {
    const list = document.getElementById('win-skill-list');
    list.innerHTML = '';
    let availSpells = window.game.getAvailableSpells();
    if(availSpells.length === 0) { list.innerHTML = '<div class="c-sys italic p-2 text-sm">尚未學習任何魔法。</div>'; return; }

    let spellsByLevel = {};
    for (let i = 1; i <= 10; i++) spellsByLevel[i] = [];
    availSpells.forEach(id => { if(window.SPELLS[id]) spellsByLevel[window.SPELLS[id].level].push(window.SPELLS[id]); });

    for (let lvl = 1; lvl <= 10; lvl++) {
        if (spellsByLevel[lvl].length > 0) {
            let groupHtml = `<div class="mb-4"><div class="text-sm c-sys border-b border-gray-800 pb-1 mb-2">${window.getChineseNumber(lvl)}階魔法</div><div class="grid grid-cols-5 gap-2">`;
            spellsByLevel[lvl].forEach(spell => {
                let canUse = window.canCastSpell(spell.level, window.game.state.level);
                let isBuff = spell.type === 'buff', isPassive = spell.type === 'passive', isHeal = spell.type === 'heal';
                let checked = window.game.state.settings.autoBuffs.includes(spell.id) ? 'checked' : '';
                let equipMark = !window.game.state.spells.includes(spell.id) ? '<span class="text-xs c-warn block">[裝備]</span>' : '';
                
                let autoHtml = '';
                if (isPassive) autoHtml = `<span class="c-sys text-xs mt-1 block">常駐被動</span>`;
                else if (isBuff && canUse && !isHeal) autoHtml = `<label class="cursor-pointer c-sys hover:text-white mt-1 text-xs"><input type="checkbox" class="w-3 h-3 align-middle" ${checked} onchange="game.toggleAutoBuff('${spell.id}', this.checked)"> 自動</label>`;
                else if (!canUse) window.game.state.settings.autoBuffs = window.game.state.settings.autoBuffs.filter(bid => bid !== spell.id);

                groupHtml += `<div class="spell-grid-item ${canUse ? '' : 'opacity-30'}"><span class="${isBuff?'c-success':(isPassive?'c-info':'c-err')} text-sm font-bold block mb-1">${spell.name}</span>${equipMark}<span class="c-sys text-xs block">${spell.mp!==undefined?'MP:'+spell.mp:''}</span>${autoHtml}</div>`;
            });
            groupHtml += `</div></div>`;
            list.insertAdjacentHTML('beforeend', groupHtml);
        }
    }
    window.game.updateSettingsUI();
};

window.game.renderInventory = function() {
    const invList = document.getElementById('win-inventory-list');
    const eqList = document.getElementById('win-equip-list');
    if(!invList || !eqList) return;
    invList.innerHTML = ''; eqList.innerHTML = '';
    
    let slotNames = { 'weapon': '武器', 'helmet': '頭盔', 'armor': '盔甲', 'shield': '盾牌', 'cloak': '斗篷', 'boots': '靴子', 'belt': '腰帶', 'amulet': '項鍊', 'ring1': '戒指 I', 'ring2': '戒指 II', 'earring1': '耳環 I', 'earring2': '耳環 II', 'gloves': '手套' };
    let activeSetItemKeys = [];
    let eqKeyToId = {};
    for(let slot in window.game.state.equipment) {
        let itemKey = window.game.state.equipment[slot];
        if(itemKey && window.game.state.inventory[itemKey]) eqKeyToId[slot] = window.game.state.inventory[itemKey].itemId;
    }
    
    let sets = window.game.getSetBonuses();
    if (sets.active.includes('死亡騎士套裝')) ['helmet', 'armor', 'gloves', 'boots'].forEach(s => activeSetItemKeys.push(window.game.state.equipment[s]));
    if (sets.active.includes('侏儒套裝')) ['helmet', 'cloak', 'shield'].forEach(s => activeSetItemKeys.push(window.game.state.equipment[s]));
    if (sets.active.includes('歐西斯套裝')) ['helmet', 'cloak', 'armor', 'shield'].forEach(s => activeSetItemKeys.push(window.game.state.equipment[s]));
    if (sets.active.includes('骷髏套裝')) ['helmet', 'armor', 'shield'].forEach(s => activeSetItemKeys.push(window.game.state.equipment[s]));

    let equippedPairs = [];
    for(let slot in window.game.state.equipment) {
        let itemKey = window.game.state.equipment[slot];
        if(itemKey && window.game.state.inventory[itemKey]) equippedPairs.push({slot: slot, key: itemKey});
    }
    equippedPairs.sort((a, b) => window.compareItems(a.key, b.key, window.game.state.inventory));
    let hasEquip = equippedPairs.length > 0;
    
    equippedPairs.forEach(pair => {
        let slot = pair.slot;
        let itemKey = pair.key;
        let item = window.game.state.inventory[itemKey];
        let def = window.ITEMS[item.itemId] || { type: 'unknown', name: '未知' };
        let displayName = window.game.getDisplayName(item, def);
        let colorClass = window.game.getItemColorClass(item, def);
        
        let extraRowClass = '';
        if (def.legendary) extraRowClass = ' item-legendary-row';
        else if (Number(item.enchant) >= 7 || (def.safe !== undefined && Number(item.enchant) > def.safe)) {
            extraRowClass = ' item-enchanted-high';
        }

        let rowClass = activeSetItemKeys.includes(itemKey) 
            ? 'set-active-row' 
            : `border-b border-zinc-800 hover:bg-white/5 transition-colors${extraRowClass}`;

        let html = `<div class="py-2.5 pl-2 pr-1 rounded-sm ${rowClass}">
            <div class="mb-2 text-sm"><span class="c-item">[${slotNames[slot] || slot.toUpperCase()}] <span class="${colorClass}">${displayName}</span></span></div>
            <div class="flex gap-1 flex-wrap justify-end">
                <button class="btn-ui border-blue-700 text-blue-300" onclick="game.showItemDetail('${itemKey}')">詳細</button>
                <button class="btn-ui" onclick="game.openEnchantModal('${itemKey}')">強化</button>
                <button class="btn-ui" onclick="game.unequip('${slot}')">卸下</button>
            </div>
        </div>`;
        eqList.insertAdjacentHTML('beforeend', html);
    });

    if(!hasEquip) eqList.innerHTML = '<div class="c-sys italic p-2 text-sm">目前無任何裝備。</div>';

    let itemKeys = Object.keys(window.game.state.inventory);
    if(itemKeys.length === 0) { invList.innerHTML = '<div class="c-sys italic p-2 text-sm">背包是空的。</div>'; return; }

    itemKeys.sort((a,b) => window.compareItems(a, b, window.game.state.inventory));

    itemKeys.forEach(key => {
        let item = window.game.state.inventory[key];
        let def = window.ITEMS[item.itemId] || { type: 'unknown', name: '未知' };
        let equippedCount = 0;
        for(let slot in window.game.state.equipment) { if(window.game.state.equipment[slot] === key) equippedCount++; }
        let displayCount = item.count - equippedCount;
        if(displayCount <= 0) return;

        let displayName = window.game.getDisplayName(item, def);
        let qty = displayCount > 1 ? ` <span class="c-sys">x${displayCount}</span>` : '';
        let actions = '';
        
        if(['weapon','helmet','armor','shield','cloak','boots','belt','amulet','ring','gloves'].includes(def.type)) {
            actions += `<button class="btn-ui border-blue-700 text-blue-300" onclick="game.showItemDetail('${key}')">詳細</button> `;
            actions += `<button class="btn-ui border-yellow-700 text-yellow-300" onclick="game.equip('${key}')">裝備</button> `;
            if(def.type !== 'belt' && def.type !== 'amulet' && def.type !== 'ring') actions += `<button class="btn-ui" onclick="game.openEnchantModal('${key}')">強化</button> `;
        } else if(def.type === 'book') {
            actions += `<button class="btn-ui c-success border-green-800" onclick="game.learnSpell('${key}')">學習</button> `;
        } else if(def.type.startsWith('potion')) {
            actions += `<button class="btn-ui c-info border-blue-800" onclick="game.usePotion('${key}')">使用</button> `;
        } else if (def.type === 'quest') {
            actions += `<button class="btn-ui border-blue-700 text-blue-300" onclick="game.showItemDetail('${key}')">詳細</button> `;
        }

        let canSell = false;
        let sellPrice = 0;
        if (['weapon','helmet','armor','shield','cloak','boots','belt','amulet','ring','gloves'].includes(def.type) && Number(item.enchant) === 0 && !def.unique) {
            if(item.isBlessed || def.isBlessed) { canSell = true; sellPrice = 100000; }
            else { 
                canSell = true;
                let dr = def.dropRate || 1;
                let realDr = dr / 100;
                if(def.type === 'weapon') sellPrice = Math.floor(60 / realDr);
                else if(['amulet','ring','belt','earring'].includes(def.type)) sellPrice = Math.floor(100 / realDr);
                else sellPrice = Math.floor(30 / realDr);
            }
        } else if (def.type === 'book') {
            canSell = true;
            sellPrice = 100 * Math.pow((window.SPELLS[def.spellId] && window.SPELLS[def.spellId].level) || 1, 2);
        }

        if (canSell) actions += `<button class="btn-ui c-sys border-gray-700" onclick="game.sellItem('${key}', ${sellPrice})" title="售價: ${sellPrice} 金幣">販賣</button>`;

        let colorClass = window.game.getItemColorClass(item, def);
        
        let extraRowClass = '';
        if (def.legendary) extraRowClass = ' item-legendary-row';
        else if (Number(item.enchant) >= 7 || (def.safe !== undefined && Number(item.enchant) > def.safe)) {
            extraRowClass = ' item-enchanted-high';
        }

        let html = `<div class="py-2.5 px-2 border-b border-zinc-800 hover:bg-white/5 transition-colors rounded-sm${extraRowClass}">
            <div class="mb-2 text-sm"><span class="${colorClass}">${displayName}${qty}</span></div>
            <div class="flex gap-1 flex-wrap justify-end">${actions}</div>
        </div>`;
        invList.insertAdjacentHTML('beforeend', html);
    });
};
