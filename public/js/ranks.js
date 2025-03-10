
const LOWEST_RANK = '45k';
const DEFAULT_RANK = '40k';

// Ranks conversion utility
const ALL_RANKS = (() => {
    const ranks = [];
    for (let i = 99; i >= 1; i--) {
        ranks.push(`${i}d`);
    }
    for (let i = 1; i <= 999; i++) {
        ranks.push(`${i}k`);
    }
    return ranks.reverse();
})();


function getDisplayRank() {
    if (convertKyuDanToLevel(getRank()) > convertKyuDanToLevel("20k")) {
        return getRank()
    }

    if (getLevel() >= 10) {
        return "Experienced Adventurer"
    } else {
        return "New Adventurer"
    }

}

function convertKyuDanToLevel(rank) {
    rank = String(rank);
    const index = ALL_RANKS.indexOf(rank);
    return index !== -1 ? index : '?';
}

function convertLevelToKyuDan(level) {
    level = parseInt(level, 10);
    if (level >= 0 && level < ALL_RANKS.length) {
        return ALL_RANKS[level];
    }
    return ALL_RANKS[ALL_RANKS.length - 1];
}

// Local storage rank management
function getRank() {
    let localRank = localStorage.getItem('local_rank');
    if (!localRank) {
        localRank = DEFAULT_RANK;
        localStorage.setItem('local_rank', localRank);
    }
    return localRank;
}

function setRank(newRank) {
    if (ALL_RANKS.includes(newRank)) {
        localStorage.setItem('local_rank', newRank);
    } else {
        console.error(`Invalid rank: ${newRank}`);
    }
}

function adjustRank(amount) {
    const currentRank = getRank();
    const currentLevel = convertKyuDanToLevel(currentRank);

    if (currentLevel === '?') {
        console.error(`Invalid current rank: ${currentRank}`);
        return;
    }

    let newLevel = Math.max(0, Math.min(ALL_RANKS.length - 1, currentLevel + amount));

    if (newLevel < convertKyuDanToLevel(LOWEST_RANK)) {
        newLevel = convertKyuDanToLevel(LOWEST_RANK); // lowest rank
    }

    const newRank = convertLevelToKyuDan(newLevel);

    setRank(newRank);
    return newRank;
}