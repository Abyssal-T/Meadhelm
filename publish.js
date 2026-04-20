const admin = require('firebase-admin');
const { Octokit } = require("@octokit/rest");

// Initialize Firebase with the Secret from GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log("Fetching latest update from Firestore...");
  const doc = await db.collection('publications').doc('latest').get();
  
  if (!doc.exists) {
    console.error("No data found in Firestore!");
    return;
  }
  
  const { code, path, repo } = doc.data();
  const [owner, repoName] = repo.split('/');

  // --- HEAVY OBFUSCATION LOGIC ---
  const hex = Buffer.from(code, 'utf8').toString('hex');
  const lockedCode = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>
(function(_0x1a2b){var _0x3c4d=function(_0x5e6f){var _0x7a8b="";for(var _0x9c0d=0;_0x9c0d<_0x5e6f.length;_0x9c0d+=2){_0x7a8b+=String.fromCharCode(parseInt(_0x5e6f.substr(_0x9c0d,2),16));}return _0x7a8b;};document.open();document.write(_0x3c4d(_0x1a2b));document.close();})("${hex}");
<\/script></body></html>`;

  // --- PUSH TO GITHUB ---
  const octokit = new Octokit({ auth: process.env.GH_TOKEN });
  
  // Get existing file SHA
  const { data: fileData } = await octokit.repos.getContent({ owner, repo: repoName, path });

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path,
    message: "🚀 Published via Firebase Middleman",
    content: Buffer.from(lockedCode).toString('base64'),
    sha: fileData.sha
  });

  console.log(`Successfully published to ${path}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
