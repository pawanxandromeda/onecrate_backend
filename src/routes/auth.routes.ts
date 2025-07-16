    import { Router } from 'express';
    import { signup, login ,loginWithGoogle} from '../controllers/auth.controller';
    import { verifyToken } from '../middleware/auth';

    const router = Router();

    router.post('/signup', signup);
    router.post('/login', login);
    router.post('/google', loginWithGoogle);
    // example protected:
    //router.get('/me', verifyToken, getProfile);

    export default router;
