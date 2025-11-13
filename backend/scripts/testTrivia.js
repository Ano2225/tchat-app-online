const { getRandomQuestion, getCategoryStats, TRIVIA_CATEGORIES } = require('../services/questionService');

async function testTriviaAPI() {
  console.log('🧠 Testing Open Trivia DB Integration...\n');
  
  // Test category stats
  console.log('📊 Fetching category statistics...');
  const stats = await getCategoryStats();
  if (stats) {
    console.log('✅ Category stats retrieved successfully');
    console.log(`Total questions available: ${stats.overall.total_num_of_verified_questions}`);
  } else {
    console.log('❌ Failed to retrieve category stats');
  }
  
  console.log('\n🎯 Available categories:');
  Object.entries(TRIVIA_CATEGORIES).forEach(([id, info]) => {
    console.log(`  ${info.emoji} ${info.name} (ID: ${id})`);
  });
  
  console.log('\n🔄 Testing question generation...');
  
  // Test multiple questions
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Question ${i} ---`);
    try {
      const question = await getRandomQuestion();
      console.log(`${question.categoryEmoji || '❓'} Category: ${question.category || 'Unknown'}`);
      console.log(`⚡ Difficulty: ${question.difficulty || 'Unknown'}`);
      console.log(`❓ Question: ${question.question}`);
      console.log(`📝 Options: ${question.options.join(', ')}`);
      console.log(`✅ Correct: ${question.correctAnswerText} (Index: ${question.correctAnswer})`);
      console.log(`💡 Explanation: ${question.explanation}`);
      console.log(`🔗 Source: ${question.source}`);
    } catch (error) {
      console.error(`❌ Error generating question ${i}:`, error.message);
    }
  }
  
  console.log('\n🎉 Trivia API test completed!');
}

// Run the test
testTriviaAPI().catch(console.error);