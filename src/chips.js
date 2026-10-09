// Suggestion Chips Data & Context Adaptation Engine

const CHIP_GROUPS = [
  {
    id: 'greetings',
    label: 'Greetings 👋',
    chips: ['Hi', 'How far?', 'How you dey?', 'What’s good?', 'Hey there!', 'Good day!']
  },
  {
    id: 'replies',
    label: 'Quick Replies 👍',
    chips: ['I dey okay', 'All good!', 'No p', '100%', 'Sure thing', 'Sounds great!']
  },
  {
    id: 'questions',
    label: 'Questions ❓',
    chips: ['Where you dey?', 'What’s up with you?', 'You free to chat?', 'How was your day?']
  },
  {
    id: 'reactions',
    label: 'Reactions 🔥',
    chips: ['Omo!', 'Wahala', 'Facts!', 'No cap 🧢', 'Na wa o', 'Lol 😂']
  }
];

function getSuggestedChips({ lastMessageText = '', isNewChat = false } = {}) {
  if (isNewChat || !lastMessageText) {
    return {
      defaultStrip: ['Hi', 'How far?', 'How you dey?', 'What’s good?'],
      groups: CHIP_GROUPS
    };
  }

  const text = lastMessageText.toLowerCase();

  if (text.includes('?') || text.includes('how') || text.includes('where') || text.includes('what')) {
    return {
      defaultStrip: ['I dey okay', 'All good!', 'Nothing much', 'I’m chillin'],
      groups: CHIP_GROUPS
    };
  }

  if (text.includes('hi') || text.includes('hello') || text.includes('hey') || text.includes('far')) {
    return {
      defaultStrip: ['How you dey?', 'What’s good?', 'I dey okay', 'Wassup!'],
      groups: CHIP_GROUPS
    };
  }

  return {
    defaultStrip: ['Omo!', 'Facts!', 'Lol 😂', 'All good!'],
    groups: CHIP_GROUPS
  };
}

module.exports = {
  CHIP_GROUPS,
  getSuggestedChips
};
