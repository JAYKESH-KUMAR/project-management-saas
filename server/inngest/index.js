import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// Inngest functions to save user data to the database

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: {
      event: "clerk/user.created",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

// Inngest functions to delete user data from the database
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: {
      event: "clerk/user.deleted",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// inngest functions to update user data in the database
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: {
      event: "clerk/user.updated",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

// Inngest functions to save workspace data to the database
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: {
      event: "clerk/organization.created",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

// Inngest functions to update workspace data in the database
const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "update-workspace-from-clerk",
    triggers: {
      event: "clerk/organization.updated",
    },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      }
    });
  }
)
//Inngest functions to delete workspace data from the database
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-with-clerk",
    triggers: {
      event: "clerk/organization.deleted",
    },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      }
    });
  }
)
//Inngest functions to save workspace member data to the database

const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: {
      event: "clerk/organizationInvitation.accepted",
    },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toLowerCase(),
      }
    });
  }
);

//Inngest function to send email on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: {
      event: "app/task.assigned",
    },
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true }

    })

    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: ` <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>

          <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:40px 15px;">
              <tr>
                <td align="center">

                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                      <td style="background:#2563eb; padding:28px 30px; text-align:center;">
                        <h1 style="margin:0; color:#ffffff; font-size:24px;">
                          New Task Assigned
                        </h1>
                        <p style="margin:8px 0 0; color:#dbeafe; font-size:14px;">
                          Project Management Platform
                        </p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:32px 30px; color:#374151;">

                        <p style="margin:0 0 18px; font-size:16px;">
                          Hi <strong>${task.assignee.name || "Team Member"}</strong>,
                        </p>

                        <p style="margin:0 0 24px; font-size:15px; line-height:1.6;">
                          You have been assigned a new task in the
                          <strong>${task.project.name}</strong> project.
                        </p>

                        <!-- Task Details -->
                        <table width="100%" cellpadding="0" cellspacing="0"
                          style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:25px;">

                          <tr>
                            <td style="padding:20px;">

                              <p style="margin:0 0 12px; font-size:14px; color:#6b7280;">
                                TASK
                              </p>

                              <h2 style="margin:0 0 18px; font-size:20px; color:#111827;">
                                ${task.title}
                              </h2>

                              <p style="margin:0 0 10px; font-size:14px;">
                                <strong>Project:</strong>
                                ${task.project.name}
                              </p>

                              <p style="margin:0 0 10px; font-size:14px;">
                                <strong>Priority:</strong>
                                ${task.priority || "Not specified"}
                              </p>

                              <p style="margin:0; font-size:14px;">
                                <strong>Due Date:</strong>
                                ${task.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : "Not specified"
        }
                              </p>

                            </td>
                          </tr>
                        </table>

                        <!-- Button -->
                        <div style="text-align:center; margin:28px 0;">
                          <a
                            href="${origin}/tasks/${task.id}"
                            style="
                              display:inline-block;
                              background:#2563eb;
                              color:#ffffff;
                              text-decoration:none;
                              padding:13px 26px;
                              border-radius:7px;
                              font-size:15px;
                              font-weight:bold;
                            "
                          >
                            View Task
                          </a>
                        </div>

                        <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#6b7280;">
                          Please review the task details and start working according to the project timeline.
                        </p>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e5e7eb;">
                        <p style="margin:0; font-size:12px; color:#9ca3af;">
                          This is an automated notification from Project-Mgt.
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    })

    if (new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()) {
      await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));
      await step.run('check-if-task-is-completed', async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true }
        })

        if (!task) return;

        if (task.status !== "Done") {
          await step.run('send-task-reminder-mail', async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Reminder for ${task.project.name}`,
              body: `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>

    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="background-color:#f4f6f8; padding:40px 15px;"
      >
        <tr>
          <td align="center">

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08);"
            >

              <!-- Header -->
              <tr>
                <td style="background:#f59e0b; padding:28px 30px; text-align:center;">
                  <h1 style="margin:0; color:#ffffff; font-size:24px;">
                    Task Due Reminder
                  </h1>

                  <p style="margin:8px 0 0; color:#fef3c7; font-size:14px;">
                    Project Management Platform
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:32px 30px; color:#374151;">

                  <p style="margin:0 0 18px; font-size:16px;">
                    Hi
                    <strong>
                      ${task.assignee.name || "Team Member"}
                    </strong>,
                  </p>

                  <p style="margin:0 0 24px; font-size:15px; line-height:1.6;">
                    This is a friendly reminder that your assigned task in the
                    <strong>${task.project.name}</strong>
                    project has reached its due date and is still not marked as completed.
                  </p>

                  <!-- Task Details -->
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; margin-bottom:25px;"
                  >
                    <tr>
                      <td style="padding:20px;">

                        <p style="margin:0 0 12px; font-size:14px; color:#92400e;">
                          TASK REMINDER
                        </p>

                        <h2 style="margin:0 0 18px; font-size:20px; color:#111827;">
                          ${task.title}
                        </h2>

                        <p style="margin:0 0 10px; font-size:14px; color:#374151;">
                          <strong>Project:</strong>
                          ${task.project.name}
                        </p>

                        <p style="margin:0 0 10px; font-size:14px; color:#374151;">
                          <strong>Priority:</strong>
                          ${task.priority || "Not specified"}
                        </p>

                        <p style="margin:0 0 10px; font-size:14px; color:#374151;">
                          <strong>Status:</strong>
                          ${task.status || "Not specified"}
                        </p>

                        <p style="margin:0; font-size:14px; color:#374151;">
                          <strong>Due Date:</strong>
                          ${task.due_date
                  ? new Date(task.due_date).toLocaleDateString()
                  : "Not specified"
                }
                        </p>

                      </td>
                    </tr>
                  </table>

                  <!-- Alert -->
                  <div
                    style="background:#fef2f2; border-left:4px solid #ef4444; padding:14px 16px; margin:0 0 25px;"
                  >
                    <p style="margin:0; color:#991b1b; font-size:14px; line-height:1.5;">
                      This task is still pending. Please review it and update its status as soon as possible.
                    </p>
                  </div>

                  <!-- Button -->
                  <div style="text-align:center; margin:28px 0;">
                    <a
                      href="${origin}/tasks/${task.id}"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        padding:13px 26px;
                        border-radius:7px;
                        font-size:15px;
                        font-weight:bold;
                      "
                    >
                      View Task
                    </a>
                  </div>

                  <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#6b7280;">
                    If you have already completed this task, please update its status in the project dashboard.
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td
                  style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e5e7eb;"
                >
                  <p style="margin:0; font-size:12px; color:#9ca3af;">
                    This is an automated reminder from Project-Mgt.
                    Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>
    </body>
  </html>`
            })
          })
        }
      })
    }


  }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail
];
