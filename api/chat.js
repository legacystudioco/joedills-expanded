 
// api/chat.js - Backend API for handling OpenAI requests
// This file should be deployed to Vercel, Netlify, or similar service

export default async function handler(req, res) {
    // Set CORS headers for Wix embedding
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, assistantId } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Your OpenAI API key should be stored as an environment variable
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        // If you have a specific Assistant ID, use the Assistants API
        // Otherwise, use the Chat Completions API with your custom prompt
        
        if (assistantId && assistantId !== 'YOUR_ASSISTANT_ID_HERE') {
            // Use OpenAI Assistants API
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({})
            });
            
            const thread = await threadResponse.json();
            
            // Add the user's message to the thread
            await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: messages[messages.length - 1].content
                })
            });
            
            // Run the assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: assistantId
                })
            });
            
            const run = await runResponse.json();
            
            // Poll for completion
            let runStatus = run;
            while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2'
                    }
                });
                runStatus = await statusResponse.json();
            }
            
            // Get the assistant's response
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            
            const threadMessages = await messagesResponse.json();
            const aiResponse = threadMessages.data[0].content[0].text.value;
            
            return res.status(200).json({ response: aiResponse });
            
        } else {
            // Use regular Chat Completions API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: messages,
                    max_tokens: 500,
                    temperature: 0.7,
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            return res.status(200).json({ response: aiResponse });
        }

    } catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
