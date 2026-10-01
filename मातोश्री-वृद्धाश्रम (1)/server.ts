import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Types
export interface BoardMember {
  id: number;
  name: string;
  designationKey: string; // 'अध्यक्ष' | 'सचिव' | 'कोषाध्यक्ष' | 'विश्वस्त'
  cityKey: string; // 'नाशिक' | 'मुंबई' | 'अ. नगर' | 'पुणे' | 'ठाणे'
  photoUrl: string | null;
}

export interface UpcomingEvent {
  id: string;
  titleMr: string;
  titleEn: string;
  descMr: string;
  descEn: string;
  locationMr: string;
  locationEn: string;
  date: string;
  time: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MANAGER';
  passwordHash: string;
  passwordSalt: string;
  active: boolean;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: 'SUPER_ADMIN' | 'MANAGER';
  expiresAt: number;
}

export interface GalleryItem {
  id: string;
  category: 'वृद्धाश्रम' | 'परिसर' | 'सुविधा' | 'भोजन' | 'उपक्रम' | 'क्षणचित्रे';
  titleMr: string;
  titleEn: string;
  imageUrl: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserAccount[];
  events: UpcomingEvent[];
  boardMembers: BoardMember[];
  gallery: GalleryItem[];
  sessions: AuthSession[];
}

// Password hashing helpers
function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

// Initial Board Members (The EXACT 14 members required)
const INITIAL_BOARD_MEMBERS: BoardMember[] = [
  { id: 1, name: 'कांतीलाल चोपडा', designationKey: 'अध्यक्ष', cityKey: 'नाशिक', photoUrl: null },
  { id: 2, name: 'अनिल खिंवसरा', designationKey: 'सचिव', cityKey: 'मुंबई', photoUrl: null },
  { id: 3, name: 'सुनील बंब', designationKey: 'कोषाध्यक्ष', cityKey: 'मुंबई', photoUrl: null },
  { id: 4, name: 'सुभाषचन्द्र रुणवाल', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null },
  { id: 5, name: 'रमेश फिरोदिया', designationKey: 'विश्वस्त', cityKey: 'अ.नगर', photoUrl: null },
  { id: 6, name: 'रमणलाल लुंकड', designationKey: 'विश्वस्त', cityKey: 'पुणे', photoUrl: null },
  { id: 7, name: 'सुमतीलाल कर्णावट', designationKey: 'विश्वस्त', cityKey: 'ठाणे', photoUrl: null },
  { id: 8, name: 'जयंतभाई शहा', designationKey: 'विश्वस्त', cityKey: 'पुणे', photoUrl: null },
  { id: 9, name: 'पारस मोदी', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null },
  { id: 10, name: 'प्रकाश दुगाड', designationKey: 'विश्वस्त', cityKey: 'पुणे', photoUrl: null },
  { id: 11, name: 'अमरचंद छाजेड', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null },
  { id: 12, name: 'निलेश छाजेड', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null },
  { id: 13, name: 'जितेश छाजेड', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null },
  { id: 14, name: 'मोतीलाल छाजेड', designationKey: 'विश्वस्त', cityKey: 'मुंबई', photoUrl: null }
];

// Initial Curated Gallery Photos Categorized by Type
const INITIAL_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'original_01',
    category: 'वृद्धाश्रम',
    titleMr: 'मुख्य इमारतीचे छायाचित्र',
    titleEn: 'Main building of the old-age home',
    imageUrl: '/images/original-01.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_02',
    category: 'परिसर',
    titleMr: 'निसर्गरम्य परिसरातील मंदिर व वाट',
    titleEn: 'Temple and pathway in the campus',
    imageUrl: '/images/original-02.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_03',
    category: 'वृद्धाश्रम',
    titleMr: 'वृद्धाश्रमाच्या इमारतीचा विस्तृत दृश्य',
    titleEn: 'Wide view of the old-age-home building',
    imageUrl: '/images/original-03.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_04',
    category: 'सुविधा',
    titleMr: 'आश्रमातील स्वच्छ व प्रशस्त मार्गिका',
    titleEn: 'Clean and spacious corridor',
    imageUrl: '/images/original-04.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_05',
    category: 'सुविधा',
    titleMr: 'निवासी खोलीचे छायाचित्र',
    titleEn: 'Resident room',
    imageUrl: '/images/original-05.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_06',
    category: 'परिसर',
    titleMr: 'परिसरातील मंदिर व हिरवाई',
    titleEn: 'Temple and greenery in the campus',
    imageUrl: '/images/original-06.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_07',
    category: 'सुविधा',
    titleMr: 'प्रार्थना व पूजास्थळ',
    titleEn: 'Prayer and worship area',
    imageUrl: '/images/original-07.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_08',
    category: 'वृद्धाश्रम',
    titleMr: 'वृद्धाश्रमाच्या इमारतीचे बाह्य दृश्य',
    titleEn: 'Exterior view of the old-age-home building',
    imageUrl: '/images/original-08.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_09',
    category: 'सुविधा',
    titleMr: 'आश्रमातील मार्गिका व खुला परिसर',
    titleEn: 'Corridor and open courtyard area',
    imageUrl: '/images/original-09.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_10',
    category: 'सुविधा',
    titleMr: 'निवासी खोलीतील सोय',
    titleEn: 'Resident room',
    imageUrl: '/images/original-10.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_11',
    category: 'सुविधा',
    titleMr: 'निवासी खोलीतील दुसरे दृश्य',
    titleEn: 'Another view of a resident room',
    imageUrl: '/images/original-11.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_12',
    category: 'परिसर',
    titleMr: 'आश्रम इमारतीचा अंतर्गत खुला परिसर',
    titleEn: 'Open courtyard area of the campus',
    imageUrl: '/images/original-12.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_13',
    category: 'वृद्धाश्रम',
    titleMr: 'संस्थेच्या इमारतीचे बाह्य दृश्य',
    titleEn: 'Exterior view of the institution building',
    imageUrl: '/images/original-13.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_14',
    category: 'वृद्धाश्रम',
    titleMr: 'आश्रम इमारतीचा समोरील भाग',
    titleEn: 'Front view of the ashram building',
    imageUrl: '/images/original-14.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_15',
    category: 'परिसर',
    titleMr: 'संस्थेच्या परिसरातील प्रवेशद्वार',
    titleEn: 'Entrance gate of the institution campus',
    imageUrl: '/images/original-15.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_16',
    category: 'वृद्धाश्रम',
    titleMr: 'आश्रम इमारतीचे बाह्य दृश्य',
    titleEn: 'Exterior view of the ashram building',
    imageUrl: '/images/original-16.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_17',
    category: 'परिसर',
    titleMr: 'परिसरातील हिरवाई व उंच झाडे',
    titleEn: 'Greenery and tall trees in the campus',
    imageUrl: '/images/original-17.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_18',
    category: 'परिसर',
    titleMr: 'इमारत व निसर्गरम्य परिसर',
    titleEn: 'Building surrounded by greenery',
    imageUrl: '/images/original-18.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_19',
    category: 'परिसर',
    titleMr: 'परिसरातील वाट व हिरवाई',
    titleEn: 'Pathway and greenery in the campus',
    imageUrl: '/images/original-19.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_20',
    category: 'परिसर',
    titleMr: 'पावसाळ्यातील परिसराचे दृश्य',
    titleEn: 'Campus view during the rainy season',
    imageUrl: '/images/original-20.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_21',
    category: 'परिसर',
    titleMr: 'मोकळे मैदान व हिरवाई',
    titleEn: 'Open ground and greenery',
    imageUrl: '/images/original-21.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_22',
    category: 'परिसर',
    titleMr: 'इमारतीलगतचा परिसर व वाट',
    titleEn: 'Path and area beside the building',
    imageUrl: '/images/original-22.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_23',
    category: 'परिसर',
    titleMr: 'परिसरातील मंदिर व हिरवाई',
    titleEn: 'Temple and greenery in the campus',
    imageUrl: '/images/original-23.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_24',
    category: 'वृद्धाश्रम',
    titleMr: 'संस्थेच्या नावासह इमारतीचे दृश्य',
    titleEn: 'Building exterior with the institution name',
    imageUrl: '/images/original-24.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_25',
    category: 'क्षणचित्रे',
    titleMr: 'संस्थेतील भेटीचे क्षणचित्र',
    titleEn: 'A moment from a visit to the institution',
    imageUrl: '/images/original-25.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  },
  {
    id: 'original_26',
    category: 'क्षणचित्रे',
    titleMr: 'संस्थेतील समूहाचे क्षणचित्र',
    titleEn: 'A group moment at the institution',
    imageUrl: '/images/original-26.jpg',
    createdAt: '2026-09-25T00:00:00.000Z'
  }
];

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const data = JSON.parse(raw) as DatabaseSchema;
      let needsSave = false;
      // Ensure all 14 board members exist
      if (!data.boardMembers || data.boardMembers.length === 0) {
        data.boardMembers = INITIAL_BOARD_MEMBERS;
        needsSave = true;
      }
      // Ensure gallery array exists
      if (!data.gallery || data.gallery.length === 0) {
        data.gallery = INITIAL_GALLERY_ITEMS;
        needsSave = true;
      }
      if (needsSave) {
        saveDatabase(data);
      }
      return data;
    }
  } catch (err) {
    console.error('Error loading db.json, re-initializing', err);
  }

  // Initial seed
  const superAdminCreds = hashPassword('Admin@Jijau2026');
  const managerCreds = hashPassword('Manager@Jijau2026');

  const initialDb: DatabaseSchema = {
    users: [
      {
        id: 'usr_super_admin_1',
        username: 'admin',
        email: 'admin@thoralya-jijau.org',
        name: 'संस्था सुपर अ‍ॅडमिन (Super Admin)',
        role: 'SUPER_ADMIN',
        passwordHash: superAdminCreds.hash,
        passwordSalt: superAdminCreds.salt,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_manager_1',
        username: 'manager',
        email: 'manager@thoralya-jijau.org',
        name: 'कार्यक्रम व्यवस्थापक (Manager)',
        role: 'MANAGER',
        passwordHash: managerCreds.hash,
        passwordSalt: managerCreds.salt,
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    events: [], // EMPTY by default! No hardcoded or dummy events!
    boardMembers: INITIAL_BOARD_MEMBERS,
    gallery: INITIAL_GALLERY_ITEMS,
    sessions: []
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db.json', err);
  }
}

// Authentication Middlewares
interface AuthenticatedRequest extends express.Request {
  user?: UserAccount;
  userRole?: 'SUPER_ADMIN' | 'MANAGER';
}

function authenticateToken(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  const db = loadDatabase();
  const session = db.sessions.find(s => s.token === token && s.expiresAt > Date.now());
  if (!session) {
    return next();
  }

  const user = db.users.find(u => u.id === session.userId && u.active);
  if (user) {
    req.user = user;
    req.userRole = user.role;
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      messageMr: 'प्रवेश नाकारला: कृपया अ‍ॅडमिन लॉगिन करा.',
      messageEn: 'Unauthorized: Please log in with admin credentials.'
    });
  }
  next();
}

function requireRole(allowedRoles: ('SUPER_ADMIN' | 'MANAGER')[]) {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        messageMr: 'परवानगी नाही: ही क्रिया करण्याची परवानगी आपल्या खात्यास नाही.',
        messageEn: 'Forbidden: You do not have permission to perform this action.'
      });
    }
    next();
  };
}

export async function startServer(listen = true){
  // Middlewares
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));
  app.use(authenticateToken);

  // Serve uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ==========================================
  // AUTHENTICATION APIS
  // ==========================================

  // Check Auth Status & Active User
  app.get('/api/auth/status', (req: AuthenticatedRequest, res) => {
    const db = loadDatabase();
    const hasSuperAdmin = db.users.some(u => u.role === 'SUPER_ADMIN');

    if (req.user) {
      return res.json({
        authenticated: true,
        needsSetup: false,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        }
      });
    }

    res.json({
      authenticated: false,
      needsSetup: !hasSuperAdmin,
      user: null
    });
  });

  // Current User Info
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    });
  });

  // Setup Initial Super Admin (Disabled if already set up)
  app.post('/api/auth/setup', (req, res) => {
    const db = loadDatabase();
    const hasSuperAdmin = db.users.some(u => u.role === 'SUPER_ADMIN');
    if (hasSuperAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        messageMr: 'सुपर अ‍ॅडमिन आधीच अस्तित्वात आहे.',
        messageEn: 'Initial Super Admin already exists.'
      });
    }

    const { username, email, password, name } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({
        error: 'InvalidInput',
        messageMr: 'कृपया किमान ६ अक्षरी पासवर्ड आणि नाव प्रविष्ट करा.',
        messageEn: 'Please enter a valid username and password (min 6 characters).'
      });
    }

    const creds = hashPassword(password);
    const newAdmin: UserAccount = {
      id: `usr_${Date.now()}`,
      username: String(username).trim(),
      email: String(email || `${username}@thoralya-jijau.org`).trim(),
      name: String(name || 'सुपर अ‍ॅडमिन').trim(),
      role: 'SUPER_ADMIN',
      passwordHash: creds.hash,
      passwordSalt: creds.salt,
      active: true,
      createdAt: new Date().toISOString()
    };

    db.users.push(newAdmin);
    saveDatabase(db);

    res.json({
      success: true,
      messageMr: 'सुपर अ‍ॅडमिन खाते यशस्वीरीत्या तयार केले!',
      messageEn: 'Initial Super Admin account created successfully!'
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({
        error: 'MissingCredentials',
        messageMr: 'कृपया वापरकर्ता नाव/ईमेल आणि पासवर्ड प्रविष्ट करा.',
        messageEn: 'Please provide username/email and password.'
      });
    }

    const db = loadDatabase();
    const normalizedId = String(loginId).trim().toLowerCase();
    const user = db.users.find(
      u => u.username.toLowerCase() === normalizedId || u.email.toLowerCase() === normalizedId
    );

    if (!user) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        messageMr: 'अवैध वापरकर्ता नाव किंवा पासवर्ड.',
        messageEn: 'Invalid username or password.'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        error: 'AccountDeactivated',
        messageMr: 'हे खाते निष्क्रिय केले गेले आहे. कृपया सुपर अ‍ॅडमिनशी संपर्क साधा.',
        messageEn: 'This account has been deactivated. Please contact Super Admin.'
      });
    }

    const valid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        messageMr: 'अवैध वापरकर्ता नाव किंवा पासवर्ड.',
        messageEn: 'Invalid username or password.'
      });
    }

    // Generate Session Token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // Clean old expired sessions
    db.sessions = db.sessions.filter(s => s.expiresAt > Date.now());
    db.sessions.push({
      token,
      userId: user.id,
      role: user.role,
      expiresAt
    });
    saveDatabase(db);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      },
      messageMr: `स्वागत आहे, ${user.name}!`,
      messageEn: `Welcome, ${user.name}!`
    });
  });

  // Logout
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const db = loadDatabase();
      db.sessions = db.sessions.filter(s => s.token !== token);
      saveDatabase(db);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // ==========================================
  // UPCOMING EVENTS APIS (DYNAMIC SYSTEM)
  // ==========================================

  // Public: Get All Upcoming Events
  app.get('/api/events', (req, res) => {
    const db = loadDatabase();
    // Sort by event date ascending or created desc
    const sorted = [...db.events].sort((a, b) => {
      if (a.date && b.date) {
        return a.date.localeCompare(b.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    res.json(sorted);
  });

  // Add Event (SUPER_ADMIN or MANAGER)
  app.post('/api/events', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req: AuthenticatedRequest, res) => {
    const {
      titleMr,
      titleEn,
      descMr,
      descEn,
      locationMr,
      locationEn,
      date,
      time,
      imageUrl
    } = req.body;

    if (!titleMr && !titleEn) {
      return res.status(400).json({
        error: 'ValidationError',
        messageMr: 'कृपया कार्यक्रमाचे नाव प्रविष्ट करा.',
        messageEn: 'Please provide event title.'
      });
    }

    const newEvent: UpcomingEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      titleMr: String(titleMr || titleEn || '').trim(),
      titleEn: String(titleEn || titleMr || '').trim(),
      descMr: String(descMr || '').trim(),
      descEn: String(descEn || descMr || '').trim(),
      locationMr: String(locationMr || 'थोरल्या माँसाहेब जिजाऊ सेवा संस्था, सामनगाव, नाशिक').trim(),
      locationEn: String(locationEn || 'Thoralya Mansaheb Jijau Seva Sanstha, Samangaon, Nashik').trim(),
      date: String(date || '').trim(),
      time: String(time || '').trim(),
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.name
    };

    const db = loadDatabase();
    db.events.push(newEvent);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      event: newEvent,
      messageMr: 'कार्यक्रम यशस्वीरीत्या जोडला गेला!',
      messageEn: 'Event added successfully!'
    });
  });

  // Edit Event (SUPER_ADMIN or MANAGER)
  app.put('/api/events/:id', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const {
      titleMr,
      titleEn,
      descMr,
      descEn,
      locationMr,
      locationEn,
      date,
      time,
      imageUrl
    } = req.body;

    const db = loadDatabase();
    const eventIndex = db.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      return res.status(404).json({
        error: 'NotFound',
        messageMr: 'हा कार्यक्रम सापडला नाही.',
        messageEn: 'Event not found.'
      });
    }

    const existing = db.events[eventIndex];
    existing.titleMr = titleMr !== undefined ? String(titleMr).trim() : existing.titleMr;
    existing.titleEn = titleEn !== undefined ? String(titleEn).trim() : existing.titleEn;
    existing.descMr = descMr !== undefined ? String(descMr).trim() : existing.descMr;
    existing.descEn = descEn !== undefined ? String(descEn).trim() : existing.descEn;
    existing.locationMr = locationMr !== undefined ? String(locationMr).trim() : existing.locationMr;
    existing.locationEn = locationEn !== undefined ? String(locationEn).trim() : existing.locationEn;
    existing.date = date !== undefined ? String(date).trim() : existing.date;
    existing.time = time !== undefined ? String(time).trim() : existing.time;
    if (imageUrl !== undefined) {
      existing.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }
    existing.updatedAt = new Date().toISOString();

    db.events[eventIndex] = existing;
    saveDatabase(db);

    res.json({
      success: true,
      event: existing,
      messageMr: 'कार्यक्रम माहिती अपडेट केली गेली!',
      messageEn: 'Event information updated successfully!'
    });
  });

  // Delete Event (SUPER_ADMIN or MANAGER)
  app.delete('/api/events/:id', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const beforeCount = db.events.length;
    db.events = db.events.filter(e => e.id !== id);

    if (db.events.length === beforeCount) {
      return res.status(404).json({
        error: 'NotFound',
        messageMr: 'हा कार्यक्रम सापडला नाही.',
        messageEn: 'Event not found.'
      });
    }

    saveDatabase(db);
    res.json({
      success: true,
      messageMr: 'कार्यक्रम यशस्वीरीत्या हटवला गेला!',
      messageEn: 'Event deleted successfully!'
    });
  });

  // ==========================================
  // BOARD MEMBERS APIS
  // ==========================================

  // Public: Get Board Members (14 members)
  app.get('/api/board-members', (req, res) => {
    const db = loadDatabase();
    res.json(db.boardMembers);
  });

  // Update Board Member (SUPER_ADMIN only)
  app.put('/api/board-members/:id', requireAuth, requireRole(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
    const memberId = parseInt(req.params.id, 10);
    const { photoUrl } = req.body;

    const db = loadDatabase();
    const member = db.boardMembers.find(m => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (photoUrl !== undefined) {
      member.photoUrl = photoUrl;
    }

    saveDatabase(db);
    res.json({
      success: true,
      member,
      messageMr: 'संचालक छायाचित्र यशस्वीपणे बदलले!',
      messageEn: 'Board member photo updated successfully!'
    });
  });

  // ==========================================
  // GALLERY APIS (Public Read, Admin/Manager Write)
  // ==========================================

  // Public: Get all gallery photos (supports optional ?category= filter)
  app.get('/api/gallery', (req, res) => {
    const db = loadDatabase();
    const { category } = req.query;
    let items = db.gallery || [];
    if (category && typeof category === 'string' && category !== 'all' && category !== 'सर्व') {
      items = items.filter(g => g.category === category);
    }
    res.json(items);
  });

  // Add new gallery photo (SUPER_ADMIN or MANAGER)
  app.post('/api/gallery', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req: AuthenticatedRequest, res) => {
    const { category, titleMr, titleEn, imageUrl } = req.body;
    if (!category || !titleMr || !imageUrl) {
      return res.status(400).json({
        error: 'ValidationError',
        messageMr: 'कृपया छायाचित्राचा वर्ग, शीर्षक व छायाचित्र द्या.',
        messageEn: 'Please provide category, title, and image.'
      });
    }

    const db = loadDatabase();
    if (!db.gallery) db.gallery = [];

    const newItem: GalleryItem = {
      id: 'gal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category,
      titleMr: titleMr.trim(),
      titleEn: (titleEn || titleMr).trim(),
      imageUrl: imageUrl.trim(),
      createdAt: new Date().toISOString()
    };

    db.gallery.unshift(newItem);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      item: newItem,
      messageMr: 'छायाचित्र यशस्वीरीत्या गॅलरीत जोडले गेले!',
      messageEn: 'Photo added to gallery successfully!'
    });
  });

  // Delete gallery photo (SUPER_ADMIN or MANAGER)
  app.delete('/api/gallery/:id', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    if (!db.gallery) db.gallery = [];

    const beforeCount = db.gallery.length;
    db.gallery = db.gallery.filter(g => g.id !== id);

    if (db.gallery.length === beforeCount) {
      return res.status(404).json({
        error: 'NotFound',
        messageMr: 'हे छायाचित्र सापडले नाही.',
        messageEn: 'Photo not found.'
      });
    }

    saveDatabase(db);
    res.json({
      success: true,
      messageMr: 'छायाचित्र यशस्वीरीत्या हटवले गेले!',
      messageEn: 'Photo deleted successfully!'
    });
  });

  // ==========================================
  // USER MANAGEMENT APIS (SUPER_ADMIN only)
  // ==========================================

  // List all users
  app.get('/api/users', requireAuth, requireRole(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
    const db = loadDatabase();
    const sanitized = db.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt
    }));
    res.json(sanitized);
  });

  // Create User (SUPER_ADMIN only)
  app.post('/api/users', requireAuth, requireRole(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
    const { username, email, password, name, role } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({
        error: 'ValidationError',
        messageMr: 'कृपया किमान ६ अक्षरांचा पासवर्ड द्या.',
        messageEn: 'Password must be at least 6 characters.'
      });
    }

    const assignedRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MANAGER';
    const db = loadDatabase();

    const normalizedUname = String(username).trim().toLowerCase();
    if (db.users.some(u => u.username.toLowerCase() === normalizedUname)) {
      return res.status(409).json({
        error: 'Conflict',
        messageMr: 'हे वापरकर्ता नाव आधीच अस्तित्वात आहे.',
        messageEn: 'This username is already taken.'
      });
    }

    const creds = hashPassword(password);
    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: String(username).trim(),
      email: String(email || `${username}@thoralya-jijau.org`).trim(),
      name: String(name || username).trim(),
      role: assignedRole,
      passwordHash: creds.hash,
      passwordSalt: creds.salt,
      active: true,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        active: newUser.active,
        createdAt: newUser.createdAt
      },
      messageMr: 'नवीन खाते यशस्वीरीत्या तयार केले!',
      messageEn: 'New account created successfully!'
    });
  });

  // Toggle user active status (SUPER_ADMIN only)
  app.put('/api/users/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { active } = req.body;

    if (req.user?.id === id) {
      return res.status(400).json({
        error: 'SelfModification',
        messageMr: 'तुम्ही तुमचे स्वतःचे खाते निष्क्रिय करू शकत नाही.',
        messageEn: 'You cannot deactivate your own account.'
      });
    }

    const db = loadDatabase();
    const target = db.users.find(u => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    target.active = Boolean(active);
    saveDatabase(db);

    res.json({
      success: true,
      active: target.active,
      messageMr: `खाते ${target.active ? 'सक्रिय' : 'निष्क्रिय'} करण्यात आले.`,
      messageEn: `Account ${target.active ? 'activated' : 'deactivated'}.`
    });
  });

  // Delete user (SUPER_ADMIN only)
  app.delete('/api/users/:id', requireAuth, requireRole(['SUPER_ADMIN']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({
        error: 'SelfDeletion',
        messageMr: 'तुम्ही स्वतःचे खाते हटवू शकत नाही.',
        messageEn: 'You cannot delete your own account.'
      });
    }

    const db = loadDatabase();
    const target = db.users.find(u => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Do not delete if last super admin
    if (target.role === 'SUPER_ADMIN') {
      const superAdmins = db.users.filter(u => u.role === 'SUPER_ADMIN');
      if (superAdmins.length <= 1) {
        return res.status(400).json({
          error: 'LastSuperAdmin',
          messageMr: 'शेवटचे सुपर अ‍ॅडमिन खाते हटवता येणार नाही.',
          messageEn: 'Cannot delete the only Super Admin account.'
        });
      }
    }

    db.users = db.users.filter(u => u.id !== id);
    db.sessions = db.sessions.filter(s => s.userId !== id);
    saveDatabase(db);

    res.json({
      success: true,
      messageMr: 'खाते यशस्वीरीत्या हटवले गेले.',
      messageEn: 'Account deleted successfully.'
    });
  });

  // ==========================================
  // IMAGE UPLOADER API (SUPER_ADMIN / MANAGER)
  // ==========================================
  app.post('/api/upload', requireAuth, requireRole(['SUPER_ADMIN', 'MANAGER']), (req, res) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Missing dataUrl string' });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid data URL format' });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      let ext = '.jpg';
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('svg')) ext = '.svg';
      else if (mimeType.includes('gif')) ext = '.gif';

      const safeBase = (filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const uniqueName = `${safeBase}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${uniqueName}`;
      res.json({
        success: true,
        url: publicUrl,
        messageMr: 'छायाचित्र यशस्वीरीत्या अपलोड झाले!',
        messageEn: 'Image uploaded successfully!'
      });
    } catch (err: any) {
      console.error('Upload error', err);
      res.status(500).json({ error: 'UploadFailed', message: err.message });
    }
  });

  // ==========================================
  // ADMIN PORTAL ROUTE
  // ==========================================
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'admin.html'));
  });

  // ==========================================
  // VITE / STATIC INTEGRATION
  // ==========================================
  if (listen) {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

    if (listen) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}
