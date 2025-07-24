import express from 'express';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/data', requireAuth, async (req, res) => {
  try {
    const mockGraphData = {
      nodes: [
        { id: 1, label: 'User', type: 'user' },
        { id: 2, label: 'Service', type: 'service' },
        { id: 3, label: 'Database', type: 'database' }
      ],
      edges: [
        { from: 1, to: 2, label: 'uses' },
        { from: 2, to: 3, label: 'connects' }
      ]
    };

    res.json({
      success: true,
      data: mockGraphData
    });
  } catch (error) {
    console.error('Graph data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/nodes', requireAuth, async (req, res) => {
  try {
    const { label, type } = req.body;
    
    const newNode = {
      id: Date.now(),
      label,
      type,
      createdBy: req.session.userId
    };

    res.json({
      success: true,
      message: 'Node created successfully',
      node: newNode
    });
  } catch (error) {
    console.error('Node creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;