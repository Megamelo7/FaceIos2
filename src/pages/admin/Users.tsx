import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Field, Modal, Badge, EmptyState } from "../../components/ui";
import { formatDate } from "../../lib/format";
import {
  UserPlus,
  Users as UsersIcon,
  Trash2,
  Loader2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

type Confirm = { kind: "delete" | "reset"; id: Id<"users">; label: string };

export default function Users() {
  const users = useQuery(api.users.list);
  const inviteUser = useMutation(api.users.invite);
  const removeUser = useMutation(api.users.remove);
  const resetPassword = useMutation(api.users.resetPassword);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [working, setWorking] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await inviteUser({ email, name });
      setSuccess(
        `Listo: ${email.trim().toLowerCase()} crea su contraseña la primera vez que ingresa.`,
      );
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "No se pudo invitar al usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm() {
    if (!confirm) return;
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      if (confirm.kind === "delete") {
        await removeUser({ userId: confirm.id });
      } else {
        await resetPassword({ userId: confirm.id });
        setSuccess(`Clave de ${confirm.label} blanqueada.`);
      }
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? String(err.data)
          : confirm.kind === "delete"
            ? "No se pudo eliminar el usuario."
            : "No se pudo blanquear la clave.",
      );
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Invitación */}
      <form onSubmit={onSubmit} className="card p-6 lg:col-span-2">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-ink-900">Invitar usuario</h3>
            <p className="text-xs text-ink-500">Tendrá acceso completo al panel.</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              required
              autoComplete="off"
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Invitar usuario
          </button>
        </div>
      </form>

      {/* Listado */}
      <div className="card overflow-hidden lg:col-span-3">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-ink-900">
            <UsersIcon className="h-5 w-5 text-ink-400" />
            Usuarios con acceso
          </h3>
          {users && (
            <span className="text-xs text-ink-400">
              {users.length} usuario{users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {users === undefined ? (
          <FullPageLoader label="Cargando usuarios…" />
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={UsersIcon} title="Sin usuarios" />
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {users.map((u) => {
              const label = u.name || u.email;
              return (
                <div key={u._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
                      {(u.name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                        {u.name || "—"}
                        {u.isMe && <Badge className="bg-brand-50 text-brand-700">Vos</Badge>}
                        {u.pending && (
                          <Badge className="bg-amber-50 text-amber-700">Sin contraseña</Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {u.email} · desde {formatDate(u.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="rounded-lg p-2 text-ink-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-30 disabled:hover:bg-transparent"
                      onClick={() => setConfirm({ kind: "reset", id: u._id, label })}
                      disabled={u.isMe || u.pending}
                      title={
                        u.isMe
                          ? "No podés blanquear tu propia clave"
                          : u.pending
                            ? "Todavía no creó su contraseña"
                            : "Blanquear clave"
                      }
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                      onClick={() => setConfirm({ kind: "delete", id: u._id, label })}
                      disabled={u.isMe}
                      title={u.isMe ? "No podés eliminar tu propio usuario" : "Eliminar acceso"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3 text-xs text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          El registro público está deshabilitado: las cuentas sólo se crean desde acá.
        </div>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        size="sm"
        title={confirm?.kind === "reset" ? "Blanquear clave" : "Eliminar usuario"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button
              className={confirm?.kind === "reset" ? "btn-primary" : "btn-danger"}
              onClick={onConfirm}
              disabled={working}
            >
              {working && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirm?.kind === "reset" ? "Blanquear" : "Eliminar"}
            </button>
          </>
        }
      >
        {confirm?.kind === "reset" ? (
          <p className="text-sm text-ink-600">
            ¿Blanquear la clave de <strong className="text-ink-900">{confirm.label}</strong>? Se
            cerrarán sus sesiones y la próxima vez que ingrese con su mail va a crear una
            contraseña nueva.
          </p>
        ) : (
          <p className="text-sm text-ink-600">
            ¿Eliminar el acceso de <strong className="text-ink-900">{confirm?.label}</strong>? Se
            cerrarán sus sesiones y no podrá volver a ingresar.
          </p>
        )}
      </Modal>
    </div>
  );
}
