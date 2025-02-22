const { Router } = require('express')
const { createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost,
    deletePost,
    removePost } = require("../controllers/postControllers")
const authMiddleware = require('../middleware/authMiddleware')
const router = Router()

router.post('/', authMiddleware, createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPosts)
router.get('/users/:id', getUserPosts)
router.patch('/:id', authMiddleware, editPost)
router.delete('/:id', authMiddleware, removePost)



module.exports = router;