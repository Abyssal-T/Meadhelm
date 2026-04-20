const admin = require('firebase-admin');
const { Octokit } = require("@octokit/rest");

// 1. Initialize Firebase (using a Secret Service Account)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  // 2. Fetch the "Pending" update from Firestore
  const doc = await db.collection('publications').doc('latest').get();
  if (!doc.exists) return console.log("No pending updates.");
  
  const { code, path, repo } = doc.data();
  const [owner, repoName] = repo.split('/');

  // 3. The Obfuscation Logic (Moved from Editor.html)
  const hex = Buffer.from(code).toString('hex');
  const lockedCode = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>
(function(_0x1a2b){var _0x3c4d=function(_0x5e6f){var _0x7a8b="";for(var _0x9c0d=0;_0x9c0d<_0x5e6f.length;_0x9c0d+=2){_0x7a8b+=String.fromCharCode(parseInt(_0x5e6f.substr(_0x9c0d,2),16));}return _0x7a8b;};document.open();document.write(_0x3c4d(_0x1a2b));document.close();})("${hex}");
</script></body></html>`;

  // 4. Push to GitHub
  const octokit = new Octokit({ auth: process.env.GH_TOKEN });
  
  // Get the current file SHA to update it
  const { data: fileData } = await octokit.repos.getContent({ owner, repo: repoName, path });

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path,
    message: "Middleman: Obfuscated Build",
    content: Buffer.from(lockedCode).toString('base64'),
    sha: fileData.sha
  });

  console.log("Published successfully!");
}

run();
