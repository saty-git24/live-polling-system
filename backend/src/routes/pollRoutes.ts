import { Router, Request, Response } from 'express';
import { PollController } from '../controllers/pollController';

const router = Router();
const pollController = new PollController();

router.post('/', (req: Request, res: Response) => pollController.createPoll(req, res));
router.get('/current', (req: Request, res: Response) => pollController.getCurrentPoll(req, res));
router.post('/vote', (req: Request, res: Response) => pollController.submitVote(req, res));
router.post('/end', (req: Request, res: Response) => pollController.endPoll(req, res));
router.get('/vote-status', (req: Request, res: Response) => pollController.checkVoteStatus(req, res));
router.get('/history', (req: Request, res: Response) => pollController.getPollHistory(req, res));
router.get('/debug', (req: Request, res: Response) => pollController.debugPoll(req, res));

export default router;