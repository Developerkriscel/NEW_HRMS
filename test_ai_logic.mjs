import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { evaluateCandidateMatchWithAi } from './lib/aiService.js';

dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  const tenant = await mongoose.connection.collection('tenants').findOne({});
  
  const jobData = {
    title: 'Software Developer',
    description: 'We need a software developer with experience in React and Node.js.',
    responsibilities: 'Write code, fix bugs, deploy apps.',
    requiredQualifications: 'JavaScript, TypeScript, React, Node.js',
  };
  
  const candidateData = {
    firstName: 'Arjun',
    lastName: 'Sharma',
    totalExperience: '4 Years',
    currentDesignation: 'Software Developer'
  };
  
  const resumeParsedData = {
    skills: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Express'],
    experience: [],
    aiSummary: 'Role: Software Developer. Experience: 4 Years.'
  };

  console.log('Testing evaluateCandidateMatchWithAi...');
  try {
    const result = await evaluateCandidateMatchWithAi(jobData, candidateData, resumeParsedData, tenant._id);
    console.log('RESULT:', result);
  } catch (err) {
    console.error('ERROR:', err);
  }
  
  await mongoose.disconnect();
}

run();
