import { isEmpty } from "class-validator";
import { NextFunction, Request, Response, Router } from "express";
import { getRepository } from "typeorm";
import Post from "../entities/Post";
import Sub from "../entities/Sub";
import User from "../entities/User";
import auth from "../middleware/auth";
import user from "../middleware/user";
import multer, { FileFilterCallback } from "multer";
import { makeId } from "../utils/helper";
import path from "path";
import fs from "fs";

const createSub = async (req: Request, res: Response) => {
  const { name, title, description } = req.body;

  const user: User = res.locals.user;

  try {
    let errors: any = {};
    if (isEmpty(name)) errors.name = "Name must not be empty";
    if (isEmpty(title)) errors.title = "Title must not be empty";

    const sub = await getRepository(Sub)
      .createQueryBuilder("sub")
      .where("lower(sub.name) = :name", { name: name.toLowerCase() })
      .getOne();

    if (sub) errors.name = "Sub exists already";

    if (Object.keys(errors).length > 0) {
      throw errors;
    }
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    const sub = new Sub({ name, description, title, user });
    await sub.save();

    return res.json(sub);
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Something went wrong" });
  }
};

const getSub = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const sub = await Sub.findOneOrFail({ name });
    const posts = await Post.find({
      where: { sub },
      order: { createdAt: "DESC" },
      relations: ["comments", "votes"],
    });

    sub.posts = posts;

    if (res.locals.user) {
      sub.posts.forEach((p) => p.setUserVote(res.locals.user));
    }

    return res.json(sub);
  } catch (error) {
    console.log(error);

    return res.status(404).json({ sub: "Sub not found" });
  }
};

const ownSub = async (req: Request, res: Response, next: NextFunction) => {
  const user: User = res.locals.user;

  try {
    const sub = await Sub.findOneOrFail({ where: { name: req.params.name } });

    if (sub.username !== user.username) {
      return res.status(403).json({ error: "You don't own this sub" });
    }

    res.locals.sub = sub;

    return next();
  } catch (error) {
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: "public/images",
    filename: (req, file, callback) => {
      const name = makeId(15);
      callback(null, name + path.extname(file.originalname));
    },
  }),
  fileFilter: (_, file: any, callback: FileFilterCallback) => {
    if (file.mimetype == "image/jpeg" || file.mimetype === "image/png") {
      callback(null, true);
    } else {
      callback(new Error("File not an image"));
    }
  },
});

const uploadSubImage = async (req: Request, res: Response) => {
  const sub: Sub = res.locals.sub;

  try {
    const type = req.body.type;

    if (type !== "image" && type !== "banner") {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid type" });
    }

    let oldImageUrn: string = "";

    if (type === "image") {
      oldImageUrn = sub.imageUrn || "";
      sub.imageUrn = req.file.filename;
    } else if (type === "banner") {
      oldImageUrn = sub.bannerUrn || "";
      sub.bannerUrn = req.file.filename;
    }

    await sub.save();

    if (oldImageUrn !== "") {
      // fs.unlinkSync(`public\\images\\${oldImageUrn}`); // WS
      fs.unlinkSync(`public/images/${oldImageUrn}`); // UNIX
    }

    return res.json(sub);
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Something went wrong" });
  }
};

const router = Router();

router.post("/", user, auth, createSub);
router.get("/:name", user, getSub);
router.post(
  "/:name/image",
  user,
  auth,
  ownSub,
  upload.single("file"),
  uploadSubImage
);

export default router;
