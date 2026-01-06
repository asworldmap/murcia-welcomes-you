const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Data Loading
const activities = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activities.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'events.json'), 'utf8'));
const translations = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'translations.json'), 'utf8'));
let rsvps = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rsvps.json'), 'utf8'));

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            "img-src": ["'self'", "data:", "https://*", "http://*"],
            "upgrade-insecure-requests": null
        },
    },
}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helpers
const getDetailedEvents = () => {
    return events.map(event => {
        const activity = activities.find(a => a.slug === event.activity_slug);
        return { ...activity, ...event };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Translation helper
app.use((req, res, next) => {
    try {
        const lang = req.query.lang || req.cookies.lang || 'en';
        res.cookie('lang', lang);
        res.locals.lang = lang;
        res.locals.t = (key) => {
            const group = translations[lang] || translations['en'];
            return group[key] || key;
        };
        next();
    } catch (e) {
        res.locals.lang = 'en';
        res.locals.t = (key) => key;
        next();
    }
});

// Layout helper
app.use((req, res, next) => {
    res.renderWithLayout = (view, data = {}) => {
        const finalData = { t: res.locals.t, lang: res.locals.lang, ...data };
        res.render(view, finalData, (err, html) => {
            if (err) return res.status(500).send(err.message);
            res.render('layout', { ...finalData, body: html, version: '2.0' });
        });
    };
    next();
});

// Routes
app.get('/', (req, res) => {
    const detailedEvents = getDetailedEvents();
    const upcomingEvents = detailedEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3);
    res.renderWithLayout('index', {
        title: res.locals.t('nav_home'),
        featuredActivities: upcomingEvents
    });
});

app.get('/calendar', (req, res) => {
    const detailedEvents = getDetailedEvents();
    res.renderWithLayout('calendar', {
        title: res.locals.t('nav_calendar'),
        events: detailedEvents,
        rsvps
    });
});

app.get('/activities', (req, res) => {
    const detailedEvents = getDetailedEvents();
    const activitiesWithNext = activities.map(activity => {
        const nextSession = detailedEvents.find(e => e.activity_slug === activity.slug && new Date(e.date) >= new Date());
        return { ...activity, nextSession };
    });
    res.renderWithLayout('activities', {
        title: 'All Activities',
        activities: activitiesWithNext
    });
});

app.get('/activities/:slug', (req, res) => {
    const activity = activities.find(a => a.slug === req.params.slug);
    if (!activity) return res.status(404).send('Activity not found');
    const detailedEvents = getDetailedEvents();
    const sessions = detailedEvents.filter(e => e.activity_slug === activity.slug && new Date(e.date) >= new Date());
    res.renderWithLayout('activity-detail', {
        title: activity.name,
        activity,
        sessions,
        rsvps
    });
});

app.get('/event/:id', (req, res) => {
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).send('Event not found');
    const activity = activities.find(a => a.slug === event.activity_slug);
    res.renderWithLayout('event-detail', {
        title: activity.name,
        event: { ...activity, ...event },
        participants: rsvps[event.id] || []
    });
});

app.post('/rsvp', async (req, res) => {
    const { name, email, eventId, avatar } = req.body;
    if (!rsvps[eventId]) rsvps[eventId] = [];
    const existingRSVP = rsvps[eventId].find(r => r.email === email);
    if (!existingRSVP) {
        rsvps[eventId].push({ name, email, avatar: avatar || '😊' });
        fs.writeFileSync(path.join(__dirname, 'data', 'rsvps.json'), JSON.stringify(rsvps, null, 2));
    }
    res.redirect(`/event/${eventId}?success=true`);
});

app.get('/about', (req, res) => {
    res.renderWithLayout('about', { title: res.locals.t('nav_story') });
});

app.get('/membership', (req, res) => {
    const plans = [
        { id: 'single', name: 'Explorer Pass', price: 9, features: ['1 Special Event Access', 'Community Chat Access', 'Digital Guide'] },
        { id: 'full', name: 'January Reset Pass', price: 29, features: ['All 20+ Events', 'Welcome Drink', 'Exclusive Tote Bag', 'VIP Support'], popular: true },
        { id: 'annual', name: 'Legacy Member', price: 199, features: ['Whole Year 2026 Access', 'Partner Discounts', 'Monthly Private Dinners', 'MWY Jacket'] }
    ];
    res.renderWithLayout('membership', { title: 'Join the Community', plans });
});

app.get('/privacy', (req, res) => {
    res.renderWithLayout('privacy', { title: 'Privacy Policy' });
});

app.get('/legal', (req, res) => {
    res.renderWithLayout('legal', { title: 'Legal Notice' });
});

app.listen(PORT, () => {
    console.log(`MWY v2.0 running on http://localhost:${PORT}`);
});
