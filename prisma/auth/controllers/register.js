import bcrypt from "bcryptjs";
import {prisma} from "../../lib/prisma.ts";

export async function register(req, res) {
  try {
    const {email, password, name} = req.body;

    if (!email || !password) {
      return res.status(400).json({message: "Email and password are required"});
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({message: "Invalid email format"});
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({message: "Password must be at least 6 characters"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    const {password: _, ...userWithoutPassword} = user;

    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({message: "Email already exists"});
    }

    console.error("Register error:", error);
    res.status(500).json({message: "Internal server error"});
  }
}
