// @ts-check

/**
 * @typedef {Object} Emoji
 * @property {string} name eg. "face with tears of joy"
 * @property {number} unicode_version
 * @property {string} category
 * @property {number} order
 * @property {string} shortname eg. ":joy:"
 * @property {string} ascii eg. ":')  :'-)"
 * @property {string} diversity
 * @property {any[]} diversities
 * @property {string} index concatenation of names/codes/aliases for searching
 * @property {string} aliases additional shortnames/shortcodes
 * @property {string} unicode
 * @property {string} [origCategory] if this emoji was moved from another category, what was it?
 * @property {string} [className] the CSS classname (not present in JSON; generated afterwards)
 */

/**
 * @typedef {Object} EmojiMap
 * @property {Emoji[]} people
 * @property {Emoji[]} activity
 * @property {Emoji[]} food
 * @property {Emoji[]} objects
 * @property {Emoji[]} nature
 * @property {Emoji[]} travel
 * @property {Emoji[]} symbols
 * @property {Emoji[]} flags
 */

/**
 * The raw emoji map, directly from the preprocessed JSON file. Maps categories to arrays of emoji data objects.
 * @type {EmojiMap}
 */
const emojiData = require('./emoji.json');

function buildMap() {
    const getCategoryName = emoji => (emoji.diversity ? 'diversity' : (emoji.origCategory || emoji.category));

    const shortnameMap = {};

    Object.values(emojiData).forEach(emojiList => {
        emojiList.forEach(emoji => {
            shortnameMap[emoji.shortname] = emoji;
            emoji.className = `emojione emojione-32-${getCategoryName(emoji)} _${emoji.unicode}`;
        });
    });

    return shortnameMap;
}

/**
 * Maps a _unique_ shortname to each emoji; no aliases (alternate shortnames) are included in this object.
 * @type {{ [shortname : string] : Emoji}}
 */
const emojiByCanonicalShortname = buildMap();

/**
 * Maps _all_ shortnames (including aliases) to emoji. Useful for completions and lookups.
 * @type {{ [shortname : string] : Emoji }}
 */
const emojiByAllShortnames = { ...emojiByCanonicalShortname };
Object.values(emojiData).forEach(emojiList => {
    emojiList.forEach(emoji => {
        // we have to split and then filter aliases -- they're space-separated
        // but sometimes have leading or trailing whitespace or multiple spaces
        // between entries, as in ":shit:  :hankey:"
        emoji.aliases
            .split(' ')
            .filter(a => a.length > 0)
            .forEach(alias => {
                if (alias in emojiByAllShortnames) {
                    console.warn(`Alias already in use when building shortname map: ${alias} (for ${emoji.name})
                                  already assigned to ${emojiByAllShortnames[alias].name}`);
                }
                emojiByAllShortnames[alias] = emoji;
            });
    });
});


/**
 * The original categories from the processed emoji data. Note that the dynamic
 * "recent" category in the emoji picker component is not included here.
 * @type {{ id : keyof EmojiMap, name : string  }[]}
 */
const emojiCategories = [
    { id: 'people', name: 'Smileys & People' },
    { id: 'nature', name: 'Animals & Nature' },
    { id: 'food', name: 'Food & Drink' },
    { id: 'activity', name: 'Activity' },
    { id: 'travel', name: 'Travel & Places' },
    { id: 'objects', name: 'Objects' },
    { id: 'symbols', name: 'Symbols' },
    { id: 'flags', name: 'Flags' }
];

module.exports = {
    emojiByAllShortnames,
    emojiByCanonicalShortname,
    emojiCategories,
    emojiData
}
