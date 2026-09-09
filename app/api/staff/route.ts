import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireRole, HttpError, signSession } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notify } from "@/lib/notify";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN");
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.department, u.designation, u.employee_id,
        u.avatar_color,
        (SELECT COUNT(*) FROM issues i WHERE i.assigned_staff_id = u.id AND i.status NOT IN ('RESOLVED','CLOSED')) AS active_issues,
        (SELECT COUNT(*) FROM issues i WHERE i.assigned_staff_id = u.id AND i.status IN ('RESOLVED','CLOSED')) AS resolved_issues
      FROM users u WHERE u.role IN ('STAFF','ADMIN') ORDER BY u.role DESC, u.name
    `).all() as Array<Record<string, unknown>>;
    return ok({ staff: rows });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const department = String(body.department ?? "").trim();
    const designation = String(body.designation ?? "").trim();
    const employeeId = String(body.employeeId ?? "").trim();
    const role = String(body.role ?? "STAFF");
    const password = String(body.password ?? "");

    if (name.length < 2) throw new HttpError(400, "Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Valid email is required");
    if (!department) throw new HttpError(400, "Department is required");
    if (password.length < 8) throw new HttpError(400, "Initial password must be at least 8 characters");
    if (!["STAFF", "ADMIN"].includes(role)) throw new HttpError(400, "Role must be STAFF or ADMIN");

    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE lower(email)=?").get(email)) {
      throw new HttpError(409, "A user with this email already exists");
    }
    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, status, department, designation, employee_id, avatar_color, created_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
    `).run(name, email, bcrypt.hashSync(password, 10), role, department, designation || null, employeeId || null, "#0ea5e9", new Date().toISOString());

    notify(Number(info.lastInsertRowid), "ISSUE", "Welcome to INTERACTA",
      "Your staff account has been created by the admin office.", "/staff");

    return ok({ id: Number(info.lastInsertRowid) }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest, _ctx: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");
    const db = getDb();
    const id = Number(body.id);
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid staff id");

    const target = db.prepare("SELECT * FROM users WHERE id=? AND role IN ('STAFF','ADMIN')").get(id) as Record<string, unknown> | undefined;
    if (!target) throw new HttpError(404, "Staff member not found");

    // prevent self-deactivation and last-admin removal
    if (body.action === "toggleStatus") {
      if (id === session.id) throw new HttpError(400, "You cannot deactivate your own account");
      const next = target.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      db.prepare("UPDATE users SET status=? WHERE id=?").run(next, id);
      return ok({ status: next });
    }

    const name = String(body.name ?? target.name).trim();
    const department = String(body.department ?? target.department).trim();
    const designation = body.designation !== undefined ? String(body.designation).trim() : target.designation;
    const employeeId = body.employeeId !== undefined ? String(body.employeeId).trim() : target.employee_id;
    if (name.length < 2) throw new HttpError(400, "Name is required");
    db.prepare("UPDATE users SET name=?, department=?, designation=?, employee_id=? WHERE id=?")
      .run(name, department, designation, employeeId, id);
    return ok({ success: true });
  });
}
