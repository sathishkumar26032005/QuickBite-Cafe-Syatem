const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose
    .connect('mongodb://localhost:27017/cafe_management', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB", err);
    });

// Schema Definitions
const orderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    menuItem: { type: String, required: true },
    quantity: { type: Number, required: true },
    status: { type: String, default: "Pending" },
});

const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
});

const Staff = mongoose.model('Staff', staffSchema);

const reservationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true },
    table: { type: String, required: true },
    status: { type: String, default: "Pending" }, // Optional: Add a status field
}); 


const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
  });
  
  // Create Menu Item Model
  const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Models
const Order = mongoose.model('Order', orderSchema);
const Reservation = mongoose.model("Reservation", reservationSchema);

// API Endpoints

// Orders
app.post('/order', async (req, res) => {
    try {
        const { name, menuItem, quantity } = req.body;
        const newOrder = new Order({ name, menuItem, quantity });
        await newOrder.save();

        io.emit('newOrder', newOrder); // Notify connected clients
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ message: "Error creating order", error });
    }
});

app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
});

// Reservations
app.post("/reservations", async (req, res) => {
    try {
        const newReservation = new Reservation(req.body);
        await newReservation.save();

        io.emit('newReservation', newReservation); // Notify connected clients
        res.status(201).json(newReservation);
    } catch (error) {
        res.status(500).json({ message: "Error creating reservation", error });
    }
});

app.get("/getReservations", async (req, res) => {
    try {
        const reservationData = await Reservation.find();
        res.status(200).json(reservationData);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reservations", error });
    }
});

// Staff Management

app.get('/staff', async (req, res) => {
    try {
        const staff = await Staff.find();
        res.json(staff);
    } catch (err) {
        res.status(500).send('Error fetching staff: ' + err.message);
    }
});

// Add a new staff member
app.post('/staff', async (req, res) => {
    const { name, role } = req.body;
    try {
        const newStaff = new Staff({ name, role });
        await newStaff.save();
        res.status(201).json(newStaff);
    } catch (err) {
        res.status(400).send('Error adding staff: ' + err.message);
    }
});

// Delete a staff member
app.delete('/staff/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Staff.findByIdAndDelete(id);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).send('Error deleting staff: ' + err.message);
    }
});

// Add a new menu item
app.get('/menu', async (req, res) => {
    try {
      const menuItems = await MenuItem.find();
      res.json(menuItems);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching menu items', error: err.message });
    }
  });
  
  // Route to add a new menu item
  app.post('/menu', async (req, res) => {
    const { name, price } = req.body;
  
    try {
      const newItem = new MenuItem({ name, price });
      const savedItem = await newItem.save();
      res.status(201).json(savedItem);
    } catch (err) {
      res.status(400).json({ message: 'Error adding menu item', error: err.message });
    }
  });
  
  // Route to update a menu item
  app.put('/menu/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;
  
    try {
      const updatedItem = await MenuItem.findByIdAndUpdate(
        id,
        { name, price },
        { new: true }
      );
  
      if (!updatedItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
  
      res.json(updatedItem);
    } catch (err) {
      res.status(400).json({ message: 'Error updating menu item', error: err.message });
    }
  });
  
  // Route to delete a menu item
  app.delete('/menu/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const deletedItem = await MenuItem.findByIdAndDelete(id);
  
      if (!deletedItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
  
      res.json({ message: 'Menu item deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting menu item', error: err.message });
    }
  });

  
  io.on('connection', socket => {
    console.log('A user connected');
    socket.on('newItem', item => socket.broadcast.emit('newItem', item));
    socket.on('deleteItem', id => socket.broadcast.emit('deleteItem', id));
  });
// WebSocket Connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
// Server Initialization
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
