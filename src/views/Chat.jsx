import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, Users, User, Plus, Search, MessageSquare, Info, X, ChevronLeft } from 'lucide-react';

export default function Chat({ user }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersForNewChat, setSelectedUsersForNewChat] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const messagesEndRef = useRef(null);

  // Load Users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load Chats containing the current user
  useEffect(() => {
    if (!user?.email) return;
    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.email)
    );
    const unsub = onSnapshot(qChats, (snapshot) => {
      const loadedChats = snapshot.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      loadedChats.sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis() || Date.now();
        const timeB = b.lastMessageTime?.toMillis() || Date.now();
        return timeB - timeA;
      });
      setChats(loadedChats);
    });
    return () => unsub();
  }, [user]);

  // Load Messages for the Selected Chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    const qMessages = query(
      collection(db, `chats/${selectedChat.id}/messages`)
    );
    const unsub = onSnapshot(qMessages, (snapshot) => {
      const loadedMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      loadedMessages.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || Date.now();
        const timeB = b.timestamp?.toMillis() || Date.now();
        return timeA - timeB; // ascending
      });
      setMessages(loadedMessages);
    });
    return () => unsub();
  }, [selectedChat]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const msgText = newMessage.trim();
      setNewMessage(''); // optimistic clear
      
      // Add message
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: msgText,
        senderId: user.email,
        timestamp: serverTimestamp(),
        readBy: [user.email]
      });

      // Update chat lastMessage
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp(),
        updatedBy: user.email
      });
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Erro ao enviar mensagem.");
    }
  };

  const getUserName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.name || email.split('@')[0];
  };

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name;
    const otherEmail = chat.participants.find(p => p !== user.email);
    return getUserName(otherEmail) || 'Usuário Desconhecido';
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (selectedUsersForNewChat.length === 0) return;

    const isGroup = selectedUsersForNewChat.length > 1;
    if (isGroup && !newGroupName.trim()) {
      alert("Informe um nome para o grupo.");
      return;
    }

    const participants = [user.email, ...selectedUsersForNewChat];

    // Check if direct chat already exists
    if (!isGroup) {
      const existing = chats.find(c => c.type === 'direct' && c.participants.includes(selectedUsersForNewChat[0]));
      if (existing) {
        setSelectedChat(existing);
        setIsNewChatModalOpen(false);
        return;
      }
    }

    try {
      const newChatRef = await addDoc(collection(db, 'chats'), {
        type: isGroup ? 'group' : 'direct',
        participants,
        name: isGroup ? newGroupName.trim() : '',
        lastMessage: 'Conversa iniciada',
        lastMessageTime: serverTimestamp(),
        createdBy: user.email
      });
      setSelectedChat({ id: newChatRef.id, type: isGroup ? 'group' : 'direct', participants, name: isGroup ? newGroupName.trim() : '' });
      setIsNewChatModalOpen(false);
      setSelectedUsersForNewChat([]);
      setNewGroupName('');
    } catch (err) {
      console.error("Error creating chat:", err);
      alert("Erro ao criar conversa.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email !== user.email && 
    u.name !== 'Aguardando Login' &&
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-lg overflow-hidden">
      
      {/* LEFT SIDEBAR (Chat List) */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-outline-variant/30 flex-col bg-surface-container-low/50`}>
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
          <h2 className="font-headline font-extrabold text-lg flex items-center gap-2 text-on-surface">
            <MessageSquare size={20} className="text-primary" />
            Mensagens
          </h2>
          <button 
            onClick={() => { setSelectedUsersForNewChat([]); setIsNewChatModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map(chat => {
            const isSelected = selectedChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChat(chat)}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${isSelected ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'hover:bg-surface-container border border-transparent'}`}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/20 shadow-sm text-on-surface">
                  {chat.type === 'group' ? <Users size={20} /> : <User size={20} />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h4 className={`font-bold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{getChatName(chat)}</h4>
                    <span className="text-[10px] text-on-surface-variant font-bold">
                      {chat.lastMessageTime ? new Date(chat.lastMessageTime.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate pr-2 mt-0.5" title={chat.lastMessage}>
                    {chat.updatedBy === user.email ? 'Você: ' : ''}{chat.lastMessage || '...'}
                  </p>
                </div>
              </div>
            );
          })}
          {chats.length === 0 && (
            <div className="text-center p-6 text-on-surface-variant">
              <MessageSquare size={32} className="mx-auto opacity-20 mb-3" />
              <p className="text-sm font-bold opacity-60">Nenhuma conversa encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL (Chat View) */}
      <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-surface-container-lowest relative`}>
        {selectedChat ? (
          <>
            <div className="h-16 border-b border-outline-variant/30 flex items-center px-4 sm:px-6 bg-surface-container-lowest/80 backdrop-blur-md z-10 shadow-sm">
              <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 mr-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30 text-on-surface mr-4">
                {selectedChat.type === 'group' ? <Users size={18} /> : <User size={18} />}
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-on-surface">{getChatName(selectedChat)}</h3>
                {selectedChat.type === 'group' && (
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {selectedChat.participants.length} membros
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-surface-container-low/20">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.email;
                const showHeader = idx === 0 || messages[idx-1].senderId !== msg.senderId || (msg.timestamp?.toMillis() - messages[idx-1].timestamp?.toMillis() > 1800000); // 30 mins
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && showHeader && selectedChat.type === 'group' && (
                      <span className="text-xs font-bold text-on-surface-variant ml-12 mb-1">{getUserName(msg.senderId)}</span>
                    )}
                    <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {(!isMe && showHeader) ? (
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex justify-center items-center shrink-0 border-2 border-outline-variant text-[10px] font-bold shadow-sm overflow-hidden text-on-surface uppercase">
                          {getUserName(msg.senderId).charAt(0)}
                        </div>
                      ) : (
                        <div className="w-8 shrink-0"></div>
                      )}
                      
                      <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-primary text-on-primary rounded-tr-sm' : 'bg-surface border border-outline-variant/50 text-on-surface rounded-tl-sm'}`}>
                        {msg.text}
                        <span className={`block text-[9px] font-bold mt-2 text-right opacity-60`}>
                          {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/30">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-surface-container px-6 py-4 rounded-full border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium pr-14"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-primary text-on-primary flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  <Send size={18} className="translate-x-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant p-8 bg-surface-container-low/20">
            <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center shadow-inner mb-6">
               <MessageSquare size={48} className="opacity-30" />
            </div>
            <h3 className="font-extrabold text-2xl mb-2 text-on-surface">SmartLab Messenger</h3>
            <p className="text-center opacity-80 max-w-sm leading-relaxed">Selecione uma conversa no painel ao lado ou inicie um novo chat para começar a integração.</p>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-scrim/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-outline-variant/30 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-container to-primary"></div>
            
            <button onClick={() => setIsNewChatModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <X size={20} />
            </button>
            <h2 className="font-headline font-extrabold text-xl mb-6 text-on-surface">Nova Conversa</h2>
            
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="text" 
                placeholder="Buscar contatos..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-outline-variant/50 bg-surface focus:border-primary transition-all shadow-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto border-y border-outline-variant/20 -mx-8 px-8 py-2 min-h-[200px]">
              {filteredUsers.map(u => {
                const checked = selectedUsersForNewChat.includes(u.email);
                return (
                  <label key={u.id} className="flex items-center gap-4 py-3 cursor-pointer group hover:bg-surface-container p-2 rounded-xl transition-colors">
                    <input 
                      type="checkbox" 
                      checked={checked}
                      onChange={() => {
                        if (checked) setSelectedUsersForNewChat(selectedUsersForNewChat.filter(email => email !== u.email));
                        else setSelectedUsersForNewChat([...selectedUsersForNewChat, u.email]);
                      }}
                      className="w-5 h-5 rounded border-2 border-outline-variant text-primary focus:ring-primary/20 accent-primary" 
                    />
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex justify-center items-center shrink-0 border border-outline-variant/50 group-hover:bg-white transition-colors">
                      <User size={14} className="opacity-60" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-on-surface text-sm">{u.name || u.email.split('@')[0]}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <form onSubmit={handleCreateChat} className="mt-6 shrink-0 space-y-4">
              {selectedUsersForNewChat.length > 1 && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">Nome do Novo Grupo</label>
                  <input 
                    type="text"
                    required
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="Ex: Marketing Digital"
                    className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant/50 bg-surface focus:border-primary transition-all font-medium"
                  />
                </div>
              )}
              <button 
                type="submit"
                disabled={selectedUsersForNewChat.length === 0}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Iniciar Conversa ({selectedUsersForNewChat.length})
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
