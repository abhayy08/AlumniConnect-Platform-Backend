import Event from '../models/Event.js';

export const createEvent = async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    const event = new Event({
      title,
      description,
      date,
      location,
      createdBy: req.userId
    });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .limit(20);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.attendees.includes(req.userId)) {
      return res.status(400).json({ error: 'Already registered' });
    }

    event.attendees.push(req.userId);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
