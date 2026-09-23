const mongoose = require('mongoose');

async function checkDB() {
  const uri = 'mongodb://devloper1_db_user:Nc7w5Jpcga7DUDOf@ac-z9ovi2n-shard-00-00.ysxyfn9.mongodb.net:27017,ac-z9ovi2n-shard-00-01.ysxyfn9.mongodb.net:27017,ac-z9ovi2n-shard-00-02.ysxyfn9.mongodb.net:27017/?ssl=true&authSource=admin&replicaSet=atlas-kptwgn-shard-0&retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', new mongoose.Schema({}, { strict: false, collection: 'candidates' }));
  const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({}, { strict: false, collection: 'applications' }));

  const cCount = await Candidate.countDocuments();
  const aCount = await Application.countDocuments();
  
  console.log(`Candidates: ${cCount}`);
  console.log(`Applications: ${aCount}`);
  
  if (cCount > 0) {
    const candidate = await Candidate.findOne().lean();
    console.log('Sample Candidate:', JSON.stringify(candidate, null, 2));
  }
  
  if (aCount > 0) {
    const application = await Application.findOne().lean();
    console.log('Sample Application:', JSON.stringify(application, null, 2));
  }

  process.exit(0);
}

checkDB().catch(console.error);
