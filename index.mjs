/// <CONFIG>

// the subreddit, without the r/. for example 'AskReddit'.
const SUBREDDIT_NAME = '';

const discordWebhooks = [
    // create a webhook for each discord channel, and place the links here.
];

/// </CONFIG>


import axios from 'axios';


async function ezpasteUpload(message) {
    const msgQuery = new URLSearchParams({
        text: message
    });
    
    let link = '';
    try {        
        const response = await axios.post('https://ezpaste.ezluci.com/upload', msgQuery, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    
        link = response.request.res.responseUrl;
    } catch (err) {
        console.log(err);
    }
    
    return link;
}


async function sendDiscordMessage(message) {
    discordWebhooks.forEach(async (webhook, idx) => {
        try {
            const response = await axios.post(webhook, {
                content: message
            });
            console.log(`Message sent to [${idx}] discord webhook`);
        } catch (error) {
            console.error(`Error sending message to [${idx}] discord webhook:`, error);
        }
    });
}


async function getNewPosts() {
    let json;
    try {
        const response = await axios.get(`https://api.reddit.com/r/${SUBREDDIT_NAME}/new`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        json = response.data;
    } catch (err) {
        console.error(err);
    }
    
    if (!json.data) {
        console.error(json);
        return;
    }
    return json.data.children;
}



let lastPostTime = Math.floor(new Date().getTime() / 1000);

setInterval(async () => {
    console.log('check...');
    const lastPosts = await getNewPosts();
    if (lastPosts === undefined) {
        return console.error('undefined');
    }
    
    let maxPostTime = 0;
    lastPosts.forEach(async (post) => {
        const postTime = Math.floor(post.data.created_utc);
        maxPostTime = Math.max(maxPostTime, postTime);
        
        if (postTime > lastPostTime) {
            const ezpasteLink = await ezpasteUpload(JSON.stringify(post.data, null, 4));
            
            let discordMessage =
`${new Date((post.data.created_utc) * 1000)}
# ${post.data.title}
\`selftext\`: ${post.data.selftext}
\`id\`: ${post.data.id}
\`author\`: ${post.data.author}
\`permalink\`: ${post.data.permalink}
\`url\`: ${post.data.url}
\`thumbnail\`: ${post.data.thumbnail}
\`media.oembed.url\`: ${post.data.media?.oembed?.url}
\`media.oembed.html\`: ${post.data.media?.oembed?.html}
`
            if (post.data.preview) {
                discordMessage += `\`preview.images\`:\n`;
                post.data.preview?.images.forEach((img, idx) => {
                    discordMessage += `   \`[${idx}].source.url\`: ${img?.source.url}\n`;
                })
            }
            
            discordMessage += `## full data:\n<${ezpasteLink}>`;
            sendDiscordMessage(discordMessage);
        }
    });
    
    lastPostTime = maxPostTime;
}, 10_000); // 10s *should* not give any errors. anything lower may not work.

console.log('on');