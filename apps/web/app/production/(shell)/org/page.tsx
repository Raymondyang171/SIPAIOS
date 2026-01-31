"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface Dept {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  email: string;
  display_name?: string | null;
  dept_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  dept_code?: string | null;
  dept_name?: string | null;
}

type TabKey = "depts" | "users";

export default function OrgPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("depts");

  const [depts, setDepts] = useState<Dept[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [deptsLoading, setDeptsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const [deptsError, setDeptsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [deptForm, setDeptForm] = useState({ code: "", name: "" });
  const [deptActionError, setDeptActionError] = useState<string | null>(null);
  const [deptSaving, setDeptSaving] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptForm, setEditDeptForm] = useState({ code: "", name: "" });

  const [userForm, setUserForm] = useState({
    email: "",
    display_name: "",
    dept_id: "",
    is_active: true,
  });
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    email: "",
    display_name: "",
    dept_id: "",
    is_active: true,
  });
  const [includeInactive, setIncludeInactive] = useState(false);

  const deptOptions = useMemo(
    () => depts.map((dept) => ({ value: dept.id, label: `${dept.code} - ${dept.name}` })),
    [depts]
  );

  useEffect(() => {
    if (activeTab === "depts") {
      fetchDepts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
      if (depts.length === 0) {
        fetchDepts();
      }
    }
  }, [activeTab, includeInactive]);

  async function readErrorMessage(response: Response) {
    const rawBody = await response.text();
    if (!rawBody) {
      return `API error: ${response.status}`;
    }

    try {
      const data = JSON.parse(rawBody) as Record<string, unknown>;
      const message =
        (data.message as string | undefined) ||
        (data.error as string | undefined) ||
        (data.detail as string | undefined);
      return message || rawBody;
    } catch {
      return rawBody;
    }
  }

  async function fetchDepts() {
    setDeptsLoading(true);
    setDeptsError(null);

    try {
      const res = await fetch("/api/depts", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const data = await res.json();
      setDepts(data.depts || data || []);
    } catch (err) {
      setDeptsError(err instanceof Error ? err.message : "Failed to load departments");
    } finally {
      setDeptsLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const url = includeInactive ? "/api/users" : "/api/users?is_active=true";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const data = await res.json();
      setUsers(data.users || data || []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleCreateDept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeptActionError(null);

    const code = deptForm.code.trim();
    const name = deptForm.name.trim();

    if (!code || !name) {
      setDeptActionError("code and name are required");
      return;
    }

    setDeptSaving(true);
    try {
      const res = await fetch("/api/depts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      setDeptForm({ code: "", name: "" });
      await fetchDepts();
    } catch (err) {
      setDeptActionError(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleUpdateDept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeptActionError(null);

    if (!editingDeptId) {
      return;
    }

    const code = editDeptForm.code.trim();
    const name = editDeptForm.name.trim();
    const payload: { code?: string; name?: string } = {};

    if (code) {
      payload.code = code;
    }
    if (name) {
      payload.name = name;
    }

    if (!payload.code && !payload.name) {
      setDeptActionError("Provide code or name to update");
      return;
    }

    setDeptSaving(true);
    try {
      const res = await fetch(`/api/depts/${editingDeptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      setEditingDeptId(null);
      setEditDeptForm({ code: "", name: "" });
      await fetchDepts();
    } catch (err) {
      setDeptActionError(err instanceof Error ? err.message : "Failed to update department");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserActionError(null);

    const email = userForm.email.trim();
    if (!email) {
      setUserActionError("email is required");
      return;
    }

    setUserSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: userForm.display_name.trim() || null,
          dept_id: userForm.dept_id || null,
          is_active: userForm.is_active,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      setUserForm({ email: "", display_name: "", dept_id: "", is_active: true });
      await fetchUsers();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setUserSaving(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserActionError(null);

    if (!editingUserId) {
      return;
    }

    const email = editUserForm.email.trim();
    const payload = {
      email: email || undefined,
      display_name: editUserForm.display_name.trim() || null,
      dept_id: editUserForm.dept_id || null,
      is_active: editUserForm.is_active,
    };

    setUserSaving(true);
    try {
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      setEditingUserId(null);
      setEditUserForm({ email: "", display_name: "", dept_id: "", is_active: true });
      await fetchUsers();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUserSaving(false);
    }
  }

  async function handleToggleUserActive(user: User, nextActive: boolean) {
    setUserActionError(null);
    setUserSaving(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      await fetchUsers();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUserSaving(false);
    }
  }

  function startEditDept(dept: Dept) {
    setEditingDeptId(dept.id);
    setEditDeptForm({ code: dept.code, name: dept.name });
    setDeptActionError(null);
  }

  function startEditUser(user: User) {
    setEditingUserId(user.id);
    setEditUserForm({
      email: user.email,
      display_name: user.display_name || "",
      dept_id: user.dept_id || "",
      is_active: user.is_active ?? true,
    });
    setUserActionError(null);
  }

  function cancelEditDept() {
    setEditingDeptId(null);
    setEditDeptForm({ code: "", name: "" });
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditUserForm({ email: "", display_name: "", dept_id: "", is_active: true });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            <Link
              href="/production"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Production
            </Link>
            <span>/</span>
            <span>Org & HR</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Org & HR
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab("depts")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "depts"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
          }`}
        >
          Users
        </button>
      </div>

      {activeTab === "depts" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={handleCreateDept}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Create Department
                </h2>
                <button
                  type="button"
                  onClick={fetchDepts}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs text-zinc-500">Code</label>
                <input
                  value={deptForm.code}
                  onChange={(event) =>
                    setDeptForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                  placeholder="e.g. PROD"
                />
                <label className="text-xs text-zinc-500">Name</label>
                <input
                  value={deptForm.name}
                  onChange={(event) =>
                    setDeptForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                  placeholder="Production"
                />
              </div>
              {deptActionError && (
                <p className="text-xs text-red-500">{deptActionError}</p>
              )}
              <button
                type="submit"
                disabled={deptSaving}
                className="w-full rounded bg-zinc-900 text-white text-sm py-2 disabled:opacity-50"
              >
                {deptSaving ? "Saving..." : "Create Department"}
              </button>
            </form>

            <form
              onSubmit={handleUpdateDept}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Edit Department
                </h2>
                <button
                  type="button"
                  onClick={cancelEditDept}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Clear
                </button>
              </div>
              {editingDeptId ? (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-xs text-zinc-500">Code</label>
                    <input
                      value={editDeptForm.code}
                      onChange={(event) =>
                        setEditDeptForm((prev) => ({ ...prev, code: event.target.value }))
                      }
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <label className="text-xs text-zinc-500">Name</label>
                    <input
                      value={editDeptForm.name}
                      onChange={(event) =>
                        setEditDeptForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={deptSaving}
                      className="flex-1 rounded bg-zinc-900 text-white text-sm py-2 disabled:opacity-50"
                    >
                      {deptSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditDept}
                      className="flex-1 rounded border border-zinc-300 text-sm py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">
                  Select a department from the list to edit.
                </p>
              )}
            </form>
          </div>

          {deptsLoading ? (
            <LoadingSkeleton />
          ) : deptsError ? (
            <ErrorPlaceholder message={deptsError} title="Unable to load departments" />
          ) : depts.length === 0 ? (
            <EmptyPlaceholder title="No departments yet" detail="Create your first department to get started." />
          ) : (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {depts.map((dept) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                        {dept.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {dept.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{dept.tenant_id}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEditDept(dept)}
                          className="text-xs text-zinc-700 hover:text-zinc-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Delete or disable is not available for departments with the current API.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={handleCreateUser}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Create User
                </h2>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs text-zinc-500">Email</label>
                <input
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                  placeholder="name@example.com"
                />
                <label className="text-xs text-zinc-500">Display name</label>
                <input
                  value={userForm.display_name}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, display_name: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                  placeholder="Optional"
                />
                <label className="text-xs text-zinc-500">Department</label>
                <select
                  value={userForm.dept_id}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, dept_id: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {deptOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={userForm.is_active}
                    onChange={(event) =>
                      setUserForm((prev) => ({ ...prev, is_active: event.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>
              {userActionError && (
                <p className="text-xs text-red-500">{userActionError}</p>
              )}
              <button
                type="submit"
                disabled={userSaving}
                className="w-full rounded bg-zinc-900 text-white text-sm py-2 disabled:opacity-50"
              >
                {userSaving ? "Saving..." : "Create User"}
              </button>
            </form>

            <form
              onSubmit={handleUpdateUser}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Edit User
                </h2>
                <button
                  type="button"
                  onClick={cancelEditUser}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Clear
                </button>
              </div>
              {editingUserId ? (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-xs text-zinc-500">Email</label>
                    <input
                      value={editUserForm.email}
                      onChange={(event) =>
                        setEditUserForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <label className="text-xs text-zinc-500">Display name</label>
                    <input
                      value={editUserForm.display_name}
                      onChange={(event) =>
                        setEditUserForm((prev) => ({ ...prev, display_name: event.target.value }))
                      }
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <label className="text-xs text-zinc-500">Department</label>
                    <select
                      value={editUserForm.dept_id}
                      onChange={(event) =>
                        setEditUserForm((prev) => ({ ...prev, dept_id: event.target.value }))
                      }
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {deptOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={editUserForm.is_active}
                        onChange={(event) =>
                          setEditUserForm((prev) => ({ ...prev, is_active: event.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={userSaving}
                      className="flex-1 rounded bg-zinc-900 text-white text-sm py-2 disabled:opacity-50"
                    >
                      {userSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditUser}
                      className="flex-1 rounded border border-zinc-300 text-sm py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">
                  Select a user from the list to edit.
                </p>
              )}
            </form>
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4"
              />
              Include inactive users
            </label>
            <button
              onClick={fetchUsers}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Refresh
            </button>
          </div>

          {usersLoading ? (
            <LoadingSkeleton />
          ) : usersError ? (
            <ErrorPlaceholder message={usersError} title="Unable to load users" />
          ) : users.length === 0 ? (
            <EmptyPlaceholder title="No users yet" detail="Create a user to get started." />
          ) : (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {user.display_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {user.dept_name ? `${user.dept_code} - ${user.dept_name}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <button
                          onClick={() => startEditUser(user)}
                          className="text-xs text-zinc-700 hover:text-zinc-900"
                        >
                          Edit
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => handleToggleUserActive(user, false)}
                            disabled={userSaving}
                            className="text-xs text-amber-700 hover:text-amber-900 disabled:opacity-50"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleUserActive(user, true)}
                            disabled={userSaving}
                            className="text-xs text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {userActionError && (
            <p className="text-xs text-red-500">{userActionError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="animate-pulse">
        <div className="h-10 bg-zinc-100 dark:bg-zinc-700" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 border-t border-zinc-200 dark:border-zinc-700 flex items-center px-4 gap-4"
          >
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-600 rounded" />
            <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-600 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorPlaceholder({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{title}</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        {message}
      </p>
    </div>
  );
}

function EmptyPlaceholder({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-center">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}
