import { Router } from 'express';
import { PollController } from '../controllers/pollController';

const router = Router();
const pollController = new PollController();

router.post('/', (req, res) => pollController.createPoll(req, res));
router.get('/current', (req, res) => pollController.getCurrentPoll(req, res));
router.post('/vote', (req, res) => pollController.submitVote(req, res));
router.post('/end', (req, res) => pollController.endPoll(req, res));
router.get('/vote-status', (req, res) => pollController.checkVoteStatus(req, res));
router.get('/history', (req, res) => pollController.getPollHistory(req, res));
router.get('/debug', (req, res) => pollController.debugPoll(req, res));

export default router;