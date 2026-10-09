const chips = require('../src/chips');

console.log('Testing Suggestion Chips Engine...');

const newChatChips = chips.getSuggestedChips({ isNewChat: true });
console.log('New chat chips:', newChatChips.defaultStrip);
if (!newChatChips.defaultStrip.includes('How far?')) throw new Error('Expected "How far?" in new chat chips');

const questionChips = chips.getSuggestedChips({ lastMessageText: 'How you dey my friend?' });
console.log('Question reply chips:', questionChips.defaultStrip);
if (!questionChips.defaultStrip.includes('I dey okay')) throw new Error('Expected "I dey okay" in reply chips');

console.log('Chips test passed successfully!');
