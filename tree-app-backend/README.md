# Tree Plantation Tracker — Backend

Complete backend for Akshar Bharati's tree plantation tracking app.

## Setup

```bash
npm install
cp .env.example .env
# .env file ko fill karo (MongoDB Atlas, Cloudinary, Plant.id keys)
npm run dev
```

## Required Free Accounts

1. **MongoDB Atlas** — https://mongodb.com/cloud/atlas (free M0 cluster)
2. **Cloudinary** — https://cloudinary.com (free tier, 25GB)
3. **Plant.id** — https://plant.id (free tier API key)

## API Endpoints

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login, returns JWT |
| GET | /api/auth/me | Logged-in | Get own profile |

### Species (Dropdown)
| Method | Route | Access | Description |
|---|---|---|---|
| GET | /api/species | Logged-in | Get active species list |
| POST | /api/species | Admin | Add new species |
| PUT | /api/species/:id | Admin | Edit species |
| DELETE | /api/species/:id | Admin | Deactivate species |

### Drives
| Method | Route | Access | Description |
|---|---|---|---|
| GET | /api/drives | Logged-in | List all drives |
| GET | /api/drives/:id | Logged-in | Get single drive |
| POST | /api/drives | Admin | Create drive |
| PUT | /api/drives/:id | Admin | Update drive |

### Tree Logs (Core Feature)
| Method | Route | Access | Description |
|---|---|---|---|
| POST | /api/tree-logs/identify | Logged-in | Upload photo, get AI species suggestion (multipart, field: `photo`) |
| POST | /api/tree-logs | Logged-in | Save a tree log entry (multipart, field: `photo`) |
| GET | /api/tree-logs/my | Logged-in | Volunteer's own logs |
| GET | /api/tree-logs | Admin | All logs (filters: `?driveId=`, `?flaggedOnly=true`) |
| PUT | /api/tree-logs/:id/review | Admin | Resolve a flagged entry |

### Dashboard
| Method | Route | Access | Description |
|---|---|---|---|
| GET | /api/dashboard/my-stats | Logged-in | Own total trees + species breakdown |
| GET | /api/dashboard/overview | Admin | Org-wide stats, time series, top volunteers |
| GET | /api/dashboard/drive/:driveId | Admin | Specific drive stats |

### Certificate
| Method | Route | Access | Description |
|---|---|---|---|
| GET | /api/certificate?from=&to= | Logged-in | Downloads a PDF certificate |

## Typical Volunteer Flow (Frontend Calls)

1. `POST /api/auth/login` → get token
2. `GET /api/drives` → show upcoming drives (optional)
3. `GET /api/species` → populate dropdown (or filtered by drive's `speciesAllowed`)
4. `POST /api/tree-logs/identify` (photo + optional driveId) → get AI suggestion
5. User confirms/edits → `POST /api/tree-logs` (photo, driveId, speciesId, count) → saved

## Notes

- All protected routes need header: `Authorization: Bearer <token>`
- No GPS/location fields anywhere — deliberate design choice (see project plan)
- `role: "admin"` on registration is open right now for early testing — lock this down before real deployment (either seed one admin manually in DB, or restrict admin creation to existing admins only)
