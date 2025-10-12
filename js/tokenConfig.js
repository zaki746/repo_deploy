// Store encrypted tokens per repo (Base64 encoded)
const repoTokens = {
    "repo1": "Z2hwXzlxR2IxME1HR01CZkxqUzdpVlpoY3c2eFZMaWRyVzNNQ1ZuYw==", // example token repo1
    "repo2": "ZGVtb190b2tlbl9yZXBvMg==", // example token repo2
};

// Get decrypted token for API call
function getTokenForRepo(repoName) {
    console.log(repoName);
    
    const encoded = repoTokens[repoName];
    if (!encoded) return '';
    return atob(encoded); // Base64 decode
   
}
