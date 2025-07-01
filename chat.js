class TeamDillsChat {
    constructor() {
        this.isExpanded = true;
        this.messages = [];
        this.isLoading = false;
        this.chatEnded = false; // NEW: prevents double-send

        this.initializeElements();
        this.attachEventListeners();

        this.messages.push({
            role: 'assistant',
            content: "Hello! I'm here to help answer your questions. How can Team Dills assist you today?"
        });

        setTimeout(() => {
            if (this.chatInput) this.chatInput.focus();
        }, 100);

        // Optional auto-send after 30 seconds of inactivity
        this.inactivityTimer = setTimeout(() => this.endChat(), 30000);
    }

    initializeElements() {
        this.chatContainer = document.getElementById('teamDillsChat');
        this.chatMinimized = document.getElementById('chatMinimized');
        this.chatExpanded = document.getElementById('chatExpanded');
        this.chatClose = document.getElementById('chatClose');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSend = document.getElementById('chatSend');
        this.noQuestionsBtn = document.getElementById('noQuestionsBtn');
    }

    attachEventListeners() {
        this.chatMinimized.addEventListener('click', () => this.expandChat());
        this.chatClose.addEventListener('click', () => this.minimizeChat());
        this.chatSend.addEventListener('click', () => this.sendMessage());
        this.noQuestionsBtn.addEventListener('click', () => this.endChat());

        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.chatInput.addEventListener('input', () => {
            this.chatSend.disabled = this.chatInput.value.trim() === '' || this.isLoading;
        });
    }

    expandChat() {
        this.isExpanded = true;
        this.chatMinimized.classList.add('hidden');
        this.chatExpanded.classList.remove('hidden');
        this.chatInput.focus();
    }

    minimizeChat() {
        this.isExpanded = false;
        this.chatExpanded.classList.add('hidden');
        this.chatMinimized.classList.remove('hidden');
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;

        if (this.chatEnded) {
            // Re-enable for continued chatting
            this.chatInput.disabled = false;
            this.chatSend.disabled = false;
            this.noQuestionsBtn.disabled = false;
            this.noQuestionsBtn.textContent = 'No Further Questions';
            this.chatEnded = false;
        }

        this.addMessage('user', message);
        this.chatInput.value = '';
        this.chatSend.disabled = true;

        this.showLoading();

        try {
            const response = await this.callOpenAI(message);
            this.hideLoading();

            if (response) {
                this.addMessage('assistant', response);
            } else {
                this.addMessage('assistant', "I'm having trouble responding right now. Please try again.");
            }
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            this.hideLoading();
            this.addMessage('assistant', "I'm experiencing technical issues. Please try again later.");
        }

        this.chatSend.disabled = false;
    }

    async callOpenAI(message) {
        try {
            this.messages.push({
                role: 'user',
                content: message
            });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.messages,
                    assistantId: 'asst_K8vwjQmMju60l9T3cT3Fw5zi'
                })
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();

            const aiResponse = data.response;
            this.messages.push({ role: 'assistant', content: aiResponse });
            return aiResponse;
        } catch (error) {
            console.error('API call failed:', error);
            return null;
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role === 'user' ? 'user' : 'bot'}`;
        messageDiv.textContent = content;

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoading() {
        this.isLoading = true;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message message-bot loading';
        loadingDiv.id = 'loadingMessage';
        loadingDiv.innerHTML = `
            <span>Team Dills is typing</span>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        `;

        this.chatMessages.appendChild(loadingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideLoading() {
        this.isLoading = false;
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) loadingMessage.remove();
    }

    async endChat() {
        if (this.chatEnded) return;
        this.chatEnded = true;

        try {
            const flatConversation = this.messages.map(m => `${m.role}: ${m.content}`).join('\n');

            const chatData = {
                timestamp: new Date().toISOString(),
                subject: this.messages[1]?.content || 'No subject',
                conversation: flatConversation,
                messageCount: this.messages.length,
                threadId: this.generateSessionId(),
                website: window.location.href
            };

            await fetch('https://hook.us2.make.com/lm78sp5thnp7a2gjf3paw9w9rlujvuie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatData)
            });

            this.addMessage('assistant', "Thank you for using Team Dills chat. Your conversation has been recorded. If you think of anything else, feel free to continue chatting!");
            this.noQuestionsBtn.textContent = 'Chat Saved';
            this.noQuestionsBtn.disabled = true;

        } catch (error) {
            console.error('Error sending chat to Make.com:', error);
            this.addMessage('assistant', "There was an issue saving your conversation, but thank you for chatting with Team Dills!");
        }
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TeamDillsChat();
});
