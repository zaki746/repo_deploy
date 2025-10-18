import 'dotenv/config';
import fs from "fs-extra";
import axios from "axios";


const token = process.env.GH_TOKEN;
const owner = process.env.OWNER;
console.log("token"+ token);
const repos = process.env.REPOS.split(",");
console.log("token"+token);

if (!token || !owner || !repos.length) {
  console.error("❌ Missing environment variables. Please check .env file.");
  process.exit(1);
}
const headers = { Authorization: `token ${token}` };

async function fetchIssues(repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;
  const res = await axios.get(url, { headers });
  
  
  return res.data;
}

function extractImageUrls(text) {
  const regex = /https:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+/g;
  return text?.match(regex) || [];
}

function extractSubIssueNumbers(text) {
  const regex = /#(\d+)/g;
  return (text?.match(regex) || []).map((m) => parseInt(m.replace("#", "")));
}

async function downloadImage(url, path) {
  const res = await axios.get(url, {
    headers,
    responseType: "arraybuffer",
    validateStatus: () => true,
  });
  if (res.status === 200) await fs.writeFile(path, res.data);
}

async function processRepo(repo) {
  console.log(`🔄 Processing ${repo}...`);
  const repoDir = `data/${repo}`;
  const assetsDir = `${repoDir}/assets`;
  await fs.ensureDir(assetsDir);

  const issues = await fetchIssues(repo);
  const existingPath = `${repoDir}/issues.json`;
  let oldIssues = [];
  if (await fs.pathExists(existingPath)) {
    oldIssues = JSON.parse(await fs.readFile(existingPath, "utf-8"));
  }

  const updated = [];

  for (const issue of issues) {
    const imgUrls = extractImageUrls(issue.body || "");
    const subIssues = extractSubIssueNumbers(issue.body || "");

    const localImgs = [];
    for (const url of imgUrls) {
      const fileName = `${url.split("/").pop()}.png`;
      const filePath = `${assetsDir}/${fileName}`;
      if (!(await fs.pathExists(filePath))) {
        console.log(`⬇️  Downloading ${fileName}`);
        await downloadImage(url, filePath);
      }
      localImgs.push(`./assets/${fileName}`);
    }

    updated.push({
      id: issue.id,
      number: issue.number,
      issueLink: `https://github.com/${owner}/${repo}/issues/`+issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((l) => l.name),
      created_at: issue.created_at,
      images: localImgs,
      sub_issues: subIssues,
    });
  }

  // Link sub-issues images
  updated.forEach((main) => {
    main.sub_issue_images = [];
    main.sub_issues.forEach((num) => {
      const child = updated.find((i) => i.number === num);
      if (child && child.images.length > 0) {
        main.sub_issue_images.push(...child.images);
      }
    });
  });

  await fs.writeFile(existingPath, JSON.stringify(updated, null, 2));
  console.log(`✅ Completed ${repo}`);
}

(async () => {
  for (const repo of repos) {
    await processRepo(repo);
  }
})();
