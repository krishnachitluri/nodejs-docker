const express = require('express');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Production-ready middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Secure session configuration for production
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    },
    name: 'sessionId'
}));

// Movie Database
const movies = [
    {
        id: 1,
        title: "Dune: Part Two",
        language: "English",
        genre: "Sci-Fi/Action",
        duration: "2h 46m",
        rating: 4.8,
        poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dnbOE6PYpUw7Q2m.jpg",
        description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
        showtimes: ["10:30 AM", "2:00 PM", "5:30 PM", "9:00 PM"]
    },
    {
        id: 2,
        title: "Kung Fu Panda 4",
        language: "English/Hindi",
        genre: "Animation/Comedy",
        duration: "1h 34m",
        rating: 4.5,
        poster: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjglahZx2gdS.jpg",
        description: "Po must train a new warrior when he's chosen to become the Spiritual Leader of the Valley of Peace.",
        showtimes: ["11:00 AM", "1:30 PM", "4:00 PM", "7:30 PM"]
    },
    {
        id: 3,
        title: "Godzilla x Kong",
        language: "English",
        genre: "Action/Sci-Fi",
        duration: "1h 55m",
        rating: 4.6,
        poster: "https://image.tmdb.org/t/p/w500/tC78P12Xc6mi0KqQXrC6fQqSnxK.jpg",
        description: "Two ancient titans, Godzilla and Kong, clash in an epic battle while humans uncover their connection to Skull Island.",
        showtimes: ["9:30 AM", "12:30 PM", "3:30 PM", "6:30 PM", "9:30 PM"]
    },
    {
        id: 4,
        title: "The Fall Guy",
        language: "English",
        genre: "Action/Comedy",
        duration: "2h 5m",
        rating: 4.7,
        poster: "https://image.tmdb.org/t/p/w500/tSz1qsmS52FfxJoWJY16toExJL4.jpg",
        description: "A stuntman, fresh off an almost career-ending accident, tracks down a missing movie star.",
        showtimes: ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM", "10:00 PM"]
    },
    {
        id: 5,
        title: "Inside Out 2",
        language: "English",
        genre: "Animation/Family",
        duration: "1h 40m",
        rating: 4.9,
        poster: "https://image.tmdb.org/t/p/w500/qe5DrkttawbsPwP2PBRVkIuAz2M.jpg",
        description: "Follow Riley, now a teenager, as new emotions join the crew inside Headquarters.",
        showtimes: ["9:00 AM", "11:30 AM", "2:00 PM", "4:30 PM", "7:00 PM"]
    },
    {
        id: 6,
        title: "Bad Boys: Ride or Die",
        language: "English",
        genre: "Action/Comedy",
        duration: "1h 55m",
        rating: 4.6,
        poster: "https://image.tmdb.org/t/p/w500/nP6RJKHxSGP1UFRKjvXajNwP2Qr.jpg",
        description: "Miami's finest are back for one last ride in this explosive action comedy.",
        showtimes: ["12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM"]
    }
];

// Theater Layout Configuration
const seatLayout = {
    sections: [
        { name: "Gold", rows: ["A", "B"], seatsPerRow: 12, price: 350 },
        { name: "Silver", rows: ["C", "D", "E"], seatsPerRow: 14, price: 280 },
        { name: "Bronze", rows: ["F", "G", "H"], seatsPerRow: 16, price: 200 }
    ]
};

// Generate all seats dynamically
function generateAllSeats() {
    const seats = {};
    seatLayout.sections.forEach(section => {
        section.rows.forEach(row => {
            seats[row] = [];
            for (let i = 1; i <= section.seatsPerRow; i++) {
                seats[row].push({
                    number: i,
                    status: 'available',
                    price: section.price,
                    section: section.name
                });
            }
        });
    });
    return seats;
}

// Initialize bookings storage
let bookings = {};
let allSeatsAvailability = {};

// Initialize seat availability for each movie and showtime
movies.forEach(movie => {
    bookings[movie.id] = {};
    allSeatsAvailability[movie.id] = {};
    
    movie.showtimes.forEach(showtime => {
        bookings[movie.id][showtime] = [];
        allSeatsAvailability[movie.id][showtime] = generateAllSeats();
    });
});

// API Routes
app.get('/api/movies', (req, res) => {
    res.json({ success: true, movies });
});

app.get('/api/movie/:id', (req, res) => {
    const movie = movies.find(m => m.id === parseInt(req.params.id));
    if (movie) {
        res.json({ success: true, movie });
    } else {
        res.status(404).json({ success: false, error: 'Movie not found' });
    }
});

app.get('/api/seats/:movieId/:showtime', (req, res) => {
    const { movieId, showtime } = req.params;
    const decodedShowtime = decodeURIComponent(showtime);
    
    if (allSeatsAvailability[movieId] && allSeatsAvailability[movieId][decodedShowtime]) {
        res.json({ 
            success: true, 
            seats: allSeatsAvailability[movieId][decodedShowtime],
            layout: seatLayout
        });
    } else {
        res.status(404).json({ success: false, error: 'Seat data not found' });
    }
});

app.post('/api/book', (req, res) => {
    try {
        const { movieId, movieTitle, showtime, selectedSeats, totalAmount, userDetails } = req.body;
        
        if (!selectedSeats || selectedSeats.length === 0) {
            return res.status(400).json({ success: false, error: 'No seats selected' });
        }
        
        // Validate all seats are still available
        const unavailableSeats = [];
        for (let seat of selectedSeats) {
            if (allSeatsAvailability[movieId][showtime][seat.row][seat.number - 1].status !== 'available') {
                unavailableSeats.push(`${seat.row}${seat.number}`);
            }
        }
        
        if (unavailableSeats.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Seats ${unavailableSeats.join(', ')} are no longer available` 
            });
        }
        
        // Book the seats
        selectedSeats.forEach(seat => {
            allSeatsAvailability[movieId][showtime][seat.row][seat.number - 1].status = 'booked';
            allSeatsAvailability[movieId][showtime][seat.row][seat.number - 1].bookedBy = userDetails.email;
            allSeatsAvailability[movieId][showtime][seat.row][seat.number - 1].bookingTime = new Date().toISOString();
        });
        
        // Generate unique booking ID
        const bookingId = 'TKT' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Store booking in session
        if (!req.session.bookings) {
            req.session.bookings = [];
        }
        
        const booking = {
            bookingId,
            movieId,
            movieTitle,
            showtime,
            seats: selectedSeats,
            totalAmount,
            userDetails,
            bookingDate: new Date().toISOString(),
            status: 'confirmed'
        };
        
        req.session.bookings.unshift(booking);
        
        res.json({
            success: true,
            bookingId,
            message: 'Booking confirmed successfully!',
            booking
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/api/my-bookings', (req, res) => {
    const userBookings = req.session.bookings || [];
    res.json({ success: true, bookings: userBookings });
});

app.get('/api/booking/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const userBookings = req.session.bookings || [];
    const booking = userBookings.find(b => b.bookingId === bookingId);
    
    if (booking) {
        res.json({ success: true, booking });
    } else {
        res.status(404).json({ success: false, error: 'Booking not found' });
    }
});

app.post('/api/cancel-booking/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const userBookings = req.session.bookings || [];
    const bookingIndex = userBookings.findIndex(b => b.bookingId === bookingId);
    
    if (bookingIndex === -1) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    const booking = userBookings[bookingIndex];
    
    // Release seats
    booking.seats.forEach(seat => {
        if (allSeatsAvailability[booking.movieId][booking.showtime][seat.row][seat.number - 1].status === 'booked') {
            allSeatsAvailability[booking.movieId][booking.showtime][seat.row][seat.number - 1].status = 'available';
            delete allSeatsAvailability[booking.movieId][booking.showtime][seat.row][seat.number - 1].bookedBy;
            delete allSeatsAvailability[booking.movieId][booking.showtime][seat.row][seat.number - 1].bookingTime;
        }
    });
    
    // Remove from session
    userBookings.splice(bookingIndex, 1);
    req.session.bookings = userBookings;
    
    res.json({ success: true, message: 'Booking cancelled successfully' });
});

// Health check endpoint for production monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Serve static files
app.use(express.static('public'));

// Serve HTML for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Movie Ticket Booking System`);
    console.log(`✅ Running on http://0.0.0.0:${PORT}`);
    console.log(`🌍 Production ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

module.exports = app;
