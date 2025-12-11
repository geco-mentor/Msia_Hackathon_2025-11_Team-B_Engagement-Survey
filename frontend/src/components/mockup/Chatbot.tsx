
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Heart, Minus, Lock } from 'lucide-react';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
}

export const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: "Hello. I'm your Workplace Wellness Companion. I'm here to listen, support your decision-making, and help you navigate the complexities of team sentiment. How are you feeling about the organization today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const generateResponse = (userText: string) => {
        const lowerText = userText.toLowerCase();

        // Therapist Persona Logic
        if (lowerText.includes('stressed') || lowerText.includes('burnout') || lowerText.includes('overwhelmed') || lowerText.includes('tired')) {
            return "I hear you, and it's completely understandable to feel that weight. Managing the well-being of others can often take a toll on your own. Specifically regarding the data, the Operations team is flagging high stress. Shall we look at some compassionate interventions for them, or would you prefer to talk more about how this is impacting you?";
        }
        if (lowerText.includes('angry') || lowerText.includes('frustrat') || lowerText.includes('upset')) {
            return "It sounds like a frustrating situation. Disconnects between effort and results can be incredibly difficult. Let's take a breath. Is this frustration coming from a specific team's performance, or a general feeling of lack of progress?";
        }
        if (lowerText.includes('sad') || lowerText.includes('bad') || lowerText.includes('worry') || lowerText.includes('anxious')) {
            return "Thank you for sharing that with me. It shows you care deeply about your people. Anxiety often comes from uncertainty. Let's look at the positive trend in the 'Respect Radar' metric—it shows your foundation of trust is still strong. We can build on that.";
        }
        if (lowerText.includes('recommend') || lowerText.includes('help') || lowerText.includes('suggestion')) {
            return "I'd suggest we focus on 'Connection' over 'Correction' this week. For the Logistics team, consider a 'No-Agenda Coffee Hour'. For Digital, the 'Deep Work' block is highly recommended to reduce their cognitive load. Which of these feels more feasible right now?";
        }
        if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
            return "Hi there. I'm here to support you. We can crunch numbers, or we can just chat about the human side of leadership. What's on your mind?";
        }

        return "I'm listening. Leadership is a journey that requires both head and heart. Could you tell me a bit more about that so I can support you better?";
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: generateResponse(newUserMsg.text),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary to-accent hover:scale-110 text-primary-foreground rounded-full shadow-2xl transition-all z-50 flex items-center justify-center group"
                    aria-label="Open Chatbot"
                >
                    <MessageSquare size={24} className="group-hover:hidden" />
                    <Heart size={24} className="hidden group-hover:block animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-healthy opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-risk-healthy"></span>
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed z-50 flex flex-col bg-popover border border-border shadow-2xl overflow-hidden
          bottom-0 right-0 w-full h-[100dvh] rounded-none
          sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl
          animate-in slide-in-from-bottom-10 duration-300 ring-1 ring-border"
                >

                    {/* Header */}
                    <div className="p-4 border-b border-border bg-muted/20 backdrop-blur-md flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg border border-primary/20">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold text-sm">Wellness Companion</h3>
                                <p className="text-muted-foreground text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-risk-healthy rounded-full animate-pulse"></span>
                                    Here for you
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full"
                                title="Minimize"
                            >
                                <Minus size={18} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-destructive/20 hover:text-destructive rounded-full"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 scrollbar-thin scrollbar-thumb-muted">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-card text-card-foreground rounded-bl-none border border-border'
                                        }`}
                                >
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-card border border-border p-4 rounded-2xl rounded-bl-none shadow-sm">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-background border-t border-border pb-8 sm:pb-4 flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                className="w-full bg-input border border-input rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted-foreground transition-all shadow-inner"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="absolute right-2 top-2 p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-muted-foreground mt-2.5 flex items-center justify-center gap-1">
                            <Lock size={10} />
                            Private & Confidential Support
                        </p>
                    </div>

                </div>
            )}
        </>
    );
};
