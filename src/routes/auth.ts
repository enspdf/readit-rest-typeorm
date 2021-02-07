import bcrypt from "bcrypt";
import { isEmpty, validate } from "class-validator";
import cookie from "cookie";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import User from "../entities/User";
import auth from "../middleware/auth";

const register = async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  try {
    let errors: any = {};

    const emailUser = await User.findOne({ email });
    const usernameUser = await User.findOne({ username });

    if (emailUser) errors.email = "Email is already taken";
    if (usernameUser) errors.username = "Username is already taken";

    if (Object.keys(errors).length > 0) {
      return res.json(400).json(errors);
    }

    const user = new User({ email, username, password });
    errors = await validate(user);

    if (errors.length > 0) return res.status(400).json({ errors });

    await user.save();

    return res.json(user);
  } catch (error) {
    console.log(error);

    return res.status(500).json(error);
  }
};

const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    let errors: any = {};

    if (isEmpty(username)) errors.username = "Username must not be empty";
    if (isEmpty(password)) errors.password = "Password must not be empty";
    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: "User not found" });

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches)
      return res.status(401).json({ password: "Password is incorrect" });

    const token = jwt.sign({ username }, process.env.JWT_SECRET!);

    res.set(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600,
        path: "/",
      })
    );

    return res.json(user);
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Something went wrong" });
  }
};

const me = (req: Request, res: Response) => {
  return res.json(res.locals.user);
};

const logout = (req: Request, res: Response) => {
  res.set(
    "Set-Cookie",
    cookie.serialize("token", "", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    })
  );

  return res.status(200).json({ success: true });
};

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);
router.get("/logout", auth, logout);

export default router;
