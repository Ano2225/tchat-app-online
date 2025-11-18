require('dotenv').config();

console.log('🔧 TEST CONFIGURATION');
console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Test import Vertex AI
try {
  const aiplatform = require('@google-cloud/aiplatform');
  console.log('✅ Module @google-cloud/aiplatform importé');
  console.log('VertexAI disponible:', !!aiplatform.VertexAI);
  console.log('Clés disponibles:', Object.keys(aiplatform));
} catch (error) {
  console.log('❌ Erreur import:', error.message);
}