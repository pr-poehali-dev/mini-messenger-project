import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const AUTH_URL = 'https://functions.poehali.dev/936cc72c-61aa-45a4-b8e4-cb376df7cb14';
const MESSENGER_URL = 'https://functions.poehali.dev/489d9652-52d6-436b-b062-b03e4d775184';
const UPLOAD_URL = 'https://functions.poehali.dev/5cf25a27-90f0-443a-90df-3dacd2e18ad5';

interface User {
  id: number;
  login: string;
  display_name: string;
  is_admin: boolean;
  avatar_url?: string;
  status?: string;
}

interface Contact {
  id: number;
  login: string;
  display_name: string;
  avatar_url?: string;
  status?: string;
  seconds_since_seen?: number;
}

interface Chat {
  chat_id: number;
  contact_id: number;
  login: string;
  display_name: string;
  avatar_url?: string;
  status?: string;
  seconds_since_seen?: number;
  last_message?: string;
}

interface Message {
  id: number;
  sender_id: number;
  message_text?: string;
  message_type: string;
  media_url?: string;
  file_name?: string;
  is_read: boolean;
  sender_name: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newContactLogin, setNewContactLogin] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadContacts();
      loadChats();
      if (user.is_admin) {
        loadAllUsers();
      }
      
      const interval = setInterval(() => {
        loadChats();
        if (selectedChat) {
          loadMessages();
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [user, selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const handleLogin = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', login, password })
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        toast({ title: 'Добро пожаловать!', description: `Вы вошли как ${data.user.display_name}` });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    if (user) {
      await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', user_id: user.id })
      });
    }
    setUser(null);
    setLogin('');
    setPassword('');
  };

  const loadContacts = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${MESSENGER_URL}?action=get_contacts&user_id=${user.id}`);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadChats = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${MESSENGER_URL}?action=get_chats&user_id=${user.id}`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;
    try {
      const response = await fetch(`${MESSENGER_URL}?action=get_messages&chat_id=${selectedChat.chat_id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${AUTH_URL}?action=list_users`);
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddContact = async () => {
    if (!user || !newContactLogin) return;
    try {
      const response = await fetch(MESSENGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_contact', user_id: user.id, contact_login: newContactLogin })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Контакт добавлен!' });
        setNewContactLogin('');
        loadContacts();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить контакт', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;
    try {
      const response = await fetch(MESSENGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          sender_id: user.id,
          receiver_id: selectedChat.contact_id,
          message_text: newMessage,
          message_type: 'text'
        })
      });
      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages();
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserLogin || !newUserPassword || !newUserDisplayName) return;
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          login: newUserLogin,
          password: newUserPassword,
          display_name: newUserDisplayName,
          is_admin: newUserIsAdmin
        })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Пользователь создан!' });
        setNewUserLogin('');
        setNewUserPassword('');
        setNewUserDisplayName('');
        setNewUserIsAdmin(false);
        loadAllUsers();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать пользователя', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (file: File, type: 'audio' | 'video' | 'photo' | 'file') => {
    if (!user || !selectedChat) return;
    
    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        const uploadResponse = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_data: base64.split(',')[1],
            file_name: file.name,
            file_type: file.type
          })
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
          const messageResponse = await fetch(MESSENGER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send_message',
              sender_id: user.id,
              receiver_id: selectedChat.contact_id,
              message_text: file.name,
              message_type: type,
              media_url: uploadData.url
            })
          });
          
          const messageData = await messageResponse.json();
          if (messageData.success) {
            toast({ title: 'Файл отправлен!' });
            loadMessages();
            loadChats();
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить файл', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
    }
  };

  const formatLastSeen = (secondsSince?: number): string => {
    if (!secondsSince || secondsSince < 60) return 'В сети';
    
    const minutes = Math.floor(secondsSince / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}д назад`;
    if (hours > 0) return `${hours}ч назад`;
    return `${minutes}м назад`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Icon name="MessageCircle" size={32} className="text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Messenger</h1>
            <p className="text-muted-foreground mt-2">Войдите в свой аккаунт</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <Icon name="LogIn" size={18} className="mr-2" />
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.display_name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-card-foreground">{user.display_name}</h2>
              <p className="text-xs text-muted-foreground">{user.is_admin ? 'Администратор' : 'Пользователь'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <Icon name="LogOut" size={18} />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="chats" className="flex-1">
              <Icon name="MessageCircle" size={16} className="mr-2" />
              Чаты
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">
              <Icon name="Users" size={16} className="mr-2" />
              Контакты
            </TabsTrigger>
            {user.is_admin && (
              <TabsTrigger value="admin" className="flex-1">
                <Icon name="Settings" size={16} className="mr-2" />
                Админ
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chats" className="flex-1 mt-0">
            <ScrollArea className="h-[calc(100vh-180px)]">
              {chats.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Нет активных чатов</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.chat_id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedChat?.chat_id === chat.chat_id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-muted">
                          {chat.display_name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{chat.display_name}</h3>
                            {chat.status === 'online' && (
                              <span className="w-2 h-2 bg-accent rounded-full"></span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatLastSeen(chat.seconds_since_seen)}
                          </span>
                        </div>
                        {chat.last_message && (
                          <p className="text-xs text-muted-foreground truncate">{chat.last_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 mt-0">
            <div className="p-4 border-b border-border">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Добавить контакт
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить контакт</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Логин пользователя</Label>
                      <Input
                        value={newContactLogin}
                        onChange={(e) => setNewContactLogin(e.target.value)}
                        placeholder="Введите логин"
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleAddContact} className="w-full">
                      Добавить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[calc(100vh-260px)]">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    const existingChat = chats.find((c) => c.contact_id === contact.id);
                    if (existingChat) {
                      setSelectedChat(existingChat);
                    } else {
                      setSelectedChat({
                        chat_id: 0,
                        contact_id: contact.id,
                        login: contact.login,
                        display_name: contact.display_name,
                        avatar_url: contact.avatar_url,
                        status: contact.status
                      });
                    }
                  }}
                  className="p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-muted">
                        {contact.display_name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm">{contact.display_name}</h3>
                      <p className="text-xs text-muted-foreground">@{contact.login}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          {user.is_admin && (
            <TabsContent value="admin" className="flex-1 mt-0">
              <div className="p-4 border-b border-border">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Icon name="UserPlus" size={16} className="mr-2" />
                      Создать пользователя
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать пользователя</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Логин</Label>
                        <Input
                          value={newUserLogin}
                          onChange={(e) => setNewUserLogin(e.target.value)}
                          placeholder="Введите логин"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Пароль</Label>
                        <Input
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Введите пароль"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Имя</Label>
                        <Input
                          value={newUserDisplayName}
                          onChange={(e) => setNewUserDisplayName(e.target.value)}
                          placeholder="Введите имя"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isAdmin"
                          checked={newUserIsAdmin}
                          onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="isAdmin">Администратор</Label>
                      </div>
                      <Button onClick={handleCreateUser} className="w-full">
                        Создать
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[calc(100vh-260px)]">
                {allUsers.map((u) => (
                  <div key={u.id} className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-muted">
                          {u.display_name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm">{u.display_name}</h3>
                        <p className="text-xs text-muted-foreground">@{u.login}</p>
                        {u.is_admin && (
                          <span className="text-xs text-accent font-medium">Администратор</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-muted">
                    {selectedChat.display_name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedChat.display_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatLastSeen(selectedChat.seconds_since_seen)}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {msg.message_type === 'text' && <p>{msg.message_text}</p>}
                      {msg.message_type === 'audio' && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Icon name="Mic" size={16} />
                            <span className="text-sm">Аудиосообщение</span>
                          </div>
                          {msg.media_url && (
                            <audio controls className="max-w-full">
                              <source src={msg.media_url} />
                            </audio>
                          )}
                        </div>
                      )}
                      {msg.message_type === 'photo' && (
                        <div className="flex flex-col gap-2">
                          {msg.media_url && (
                            <img src={msg.media_url} alt={msg.message_text} className="max-w-full rounded-lg" />
                          )}
                          <span className="text-xs">{msg.message_text}</span>
                        </div>
                      )}
                      {msg.message_type === 'video' && (
                        <div className="flex flex-col gap-2">
                          {msg.media_url && (
                            <video controls className="max-w-full rounded-lg">
                              <source src={msg.media_url} />
                            </video>
                          )}
                          <span className="text-xs">{msg.message_text}</span>
                        </div>
                      )}
                      {msg.message_type === 'file' && (
                        <a href={msg.media_url} download className="flex items-center gap-2 hover:underline">
                          <Icon name="File" size={16} />
                          <span className="text-sm">{msg.message_text}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const type = file.type.startsWith('image/') ? 'photo' :
                                   file.type.startsWith('video/') ? 'video' :
                                   file.type.startsWith('audio/') ? 'audio' : 'file';
                      handleFileUpload(file, type);
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploadingFile}
                >
                  <Icon name="Paperclip" size={18} />
                </Button>
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'audio');
                  }}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => document.getElementById('audio-upload')?.click()}
                  disabled={uploadingFile}
                >
                  <Icon name="Mic" size={18} />
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  className="min-h-[44px] max-h-[120px] resize-none flex-1"
                  disabled={uploadingFile}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} size="icon" disabled={uploadingFile}>
                  <Icon name="Send" size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Icon name="MessageCircle" size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold text-muted-foreground">Выберите чат</h2>
              <p className="text-muted-foreground mt-2">Начните общаться с вашими контактами</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}