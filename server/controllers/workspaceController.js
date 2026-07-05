import prisma from "../configs/prisma.js";

// Get all workspaces for a user
export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = req.params;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        owner: true,
      },
    });

    res.json(workspaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

// Add member to workspace
export const addMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { email, role, workspaceId, message } = req.body;

    // Check required parameters
    if (!email || !workspaceId || !role) {
      return res.status(400).json({
        message: "Missing required parameters",
      });
    }

    // Check valid role
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Fetch workspace
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        members: true,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check requester has ADMIN role
    const isAdmin = workspace.members.some(
      (member) =>
        member.userId === userId &&
        member.role === "ADMIN"
    );

    if (!isAdmin) {
      return res.status(401).json({
        message: "You do not have admin privileges",
      });
    }

    // Check if TARGET user is already a member
    const existingMember = workspace.members.find(
      (member) => member.userId === user.id
    );

    if (existingMember) {
      return res.status(400).json({
        message: "User is already a member of this workspace",
      });
    }

    // Add target user to workspace
    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
      },
    });

    return res.status(201).json({
      message: "Member added successfully",
      member,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.code || error.message,
    });
  }
};