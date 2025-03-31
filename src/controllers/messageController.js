import Message from '../models/Message.js';

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const message = new Message({
      sender: req.userId,
      receiver: receiverId,
      content
    });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.userId }, { receiver: req.userId }]
    })
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: -1 });

    // Group messages by conversation
    const conversations = messages.reduce((acc, msg) => {
      const otherId = msg.sender._id.toString() === req.userId ? 
        msg.receiver._id : msg.sender._id;
      
      if (!acc[otherId]) {
        acc[otherId] = {
          user: msg.sender._id.toString() === req.userId ? msg.receiver : msg.sender,
          messages: []
        };
      }
      acc[otherId].messages.push(msg);
      return acc;
    }, {});

    res.json(Object.values(conversations));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markMessageAsRead = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.userId },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};