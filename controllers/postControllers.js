const Post = require('../models/postModel')
const User = require('../models/userModel')
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require("uuid")
const HttpError = require('../models/errorModel')
const { mongoose } = require('mongoose')




const createPost = async (req, res, next) => {
    try {
        let { title, category, description } = req.body;
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill in all fields and choose thumbnail.", 422))
        }

        const { thumbnail } = req.files;

        if (thumbnail.size > 2000000) {
            return next(new HttpError("Thumbnail too big. File size should be less than 2mb"))
        }

        let fileName;
        fileName = thumbnail.name;
        let splittedFilename = fileName.split('.')
        let newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1]
        thumbnail.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if (err) {
                return next(new HttpError(err))
            } else {
                const newPost = await Post.create({ title, category, description, thumbnail: newFilename, creator: req.user.id });
                if (!newPost) {
                    return next(new HttpError("Something went wrong.", 422))
                }

                const currentUser = await User.findById(req.user.id)
                const userPostCount = currentUser?.posts + 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })

                res.status(201).json(newPost)
            }
        })
    } catch (error) {
        return next(new HttpError(error))
    }
}




const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error))
    }
}





const getPost = async (req, res, next) => {
    try {
        const postID = req.params.id;
        const post = await Post.findById(postID);
        if (!post) {
            return next(new HttpError("Post not found.", 404))
        }
        res.status(200).json(post);
    } catch (error) {
        return next(new HttpError(error));
    }
}



const getCatPosts = async (req, res, next) => {
    try {
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 })
        res.json(catPosts)
    } catch (error) {
        return next(new HttpError(error))
    }
}



const getUserPosts = async (req, res, next) => {
    const { id } = req.params;
    try {
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        res.json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}






const editPost = async (req, res, next) => {
    let fileName;
    let newFilename;
    let updatedPost;

    try {
        const postID = req.params.id;
        const { title, category, description } = req.body;


        if (!title || title.trim() === '') {
            return next(new HttpError("Title is required", 422));
        }

        if (!category || category.trim() === '') {
            return next(new HttpError("Category is required", 422));
        }

        if (!description || description.trim().length < 12) {
            return next(new HttpError("Description must be 12 characters long", 422));
        }


        const oldPost = await Post.findById(postID);
        if (!oldPost) {
            return next(new HttpError("Post not found", 404));
        }


        if (req.user.id !== String(oldPost.creator)) {
            return next(new HttpError("Unauthorized for this post.", 403));
        }


        if (!req.files || !req.files.thumbnail) {
            updatedPost = await Post.findByIdAndUpdate(
                postID,
                { title, category, description },
                { new: true }
            );
        } else {

            const { thumbnail } = req.files;


            if (thumbnail.size > 2000000) {
                return next(new HttpError("Thumbnail too big", 422));
            }


            try {
                if (oldPost.thumbnail) {
                    fs.unlinkSync(path.join(__dirname, '..', 'uploads', oldPost.thumbnail));
                }
            } catch (unlinkError) {
                console.error("Failed to delete thumbnail:", unlinkError);
            }


            fileName = thumbnail.name;
            const splittedFilename = fileName.split('.');
            newFilename = `${splittedFilename[0]}${uuid()}.${splittedFilename[splittedFilename.length - 1]}`;


            try {
                thumbnail.mv(path.join(__dirname, '..', 'uploads', newFilename));
            } catch (mvError) {
                return next(new HttpError("Failed to upload thumbnail", 500));
            }


            updatedPost = await Post.findByIdAndUpdate(
                postID,
                { title, category, description, thumbnail: newFilename },
                { new: true }
            );
        }


        if (!updatedPost) {
            return next(new HttpError("Could not update post", 400));
        }


        return res.status(200).json(updatedPost);

    } catch (error) {
        console.error("Error in editPost:", error);

        if (!res.headersSent) {
            return next(new HttpError("Something bad", 500));
        }
    }
};




const removePost = async (req, res, next) => {
    const postID = req.params.id;
    if (!postID) {
        return next(new HttpError("Post unavailable"))
    }
    const post = await Post.findById(postID);
    const fileName = post?.thumbnail;
    if (req.user.id == post.creator) {

        fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
            if (err) {
                return next(err)
            } else {
                await Post.findByIdAndDelete(postID)

                const currentUser = await User.findById(req.user.id)
                const userPostCount = currentUser?.posts - 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })
                res.json(`Post ${postID} deleted`)
            }
        })
    } else {
        return next(new HttpError("Couldn't delete post.", 403))
    }
}

module.exports = { getPosts, getPost, getCatPosts, getUserPosts, createPost, editPost, removePost }