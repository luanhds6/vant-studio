import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta (serviceKey ausente)." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: caller },
      error: userErr,
    } = await admin.auth.getUser(accessToken);

    if (userErr || !caller) {
      return new Response(
        JSON.stringify({
          error: userErr?.message ?? "Sessão inválida ou expirada.",
          code: "AUTH_FAILED",
        }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const body = (await req.json()) as {
      userId?: string;
      password?: string;
      email?: string;
      name?: string;
      role?: string;
      permissions?: string[];
      mustChangePassword?: boolean;
    };

    const targetId = body.userId;
    if (!targetId || typeof targetId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const emailRaw =
      typeof body.email === "string" ? body.email.trim() : "";
    const nameRaw =
      typeof body.name === "string" ? body.name.trim() : undefined;
    const roleRaw =
      typeof body.role === "string" ? body.role.trim() : undefined;
    const permissions = Array.isArray(body.permissions) ? body.permissions : undefined;
    const mustChangePassword =
      typeof body.mustChangePassword === "boolean" ? body.mustChangePassword : undefined;

    if (password && password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("role, permissions")
      .eq("id", caller.id)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const roleLc = (profile?.role ?? "").toString().trim().toLowerCase();
    const isAdminRole =
      roleLc === "admin" ||
      roleLc === "administrador" ||
      roleLc === "administrator" ||
      roleLc === "master";
    const canManageOthers =
      isAdminRole ||
      (Array.isArray(profile?.permissions) &&
        profile.permissions.includes("usuarios"));

    const isSelf = targetId === caller.id;
    if (!canManageOthers && !isSelf) {
      return new Response(JSON.stringify({ error: "Forbidden: Sem permissão para atualizar este usuário" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const attrs: { password?: string; email?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> } = {};
    if (password) attrs.password = password;
    if (emailRaw) {
      attrs.email = emailRaw;
      attrs.email_confirm = true;
    }
    if (nameRaw || roleRaw) {
      attrs.user_metadata = {
        ...(nameRaw && { name: nameRaw }),
        ...(roleRaw && { role: roleRaw }),
      };
    }

    if (Object.keys(attrs).length > 0) {
      const { error: updErr } = await admin.auth.admin.updateUserById(
        targetId,
        attrs
      );

      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // Also update public.profiles with service role
    const profilePatch: Record<string, unknown> = {};
    if (nameRaw !== undefined) profilePatch.name = nameRaw;
    if (emailRaw) profilePatch.email = emailRaw;
    if (roleRaw !== undefined) {
      const rLc = roleRaw.toLowerCase();
      const rStored =
        rLc === "admin" || rLc === "administrador" || rLc === "master" ? "admin" : "user";
      profilePatch.role = rStored;
      if (rStored === "admin") {
        profilePatch.permissions = [
          "pagina_inicial",
          "gerar_catalogo",
          "novo_produto",
          "produtos",
          "configuracoes",
          "usuarios",
        ];
      }
    }
    if (permissions !== undefined && profilePatch.role !== "admin") {
      profilePatch.permissions = permissions;
    }
    if (mustChangePassword !== undefined) {
      profilePatch.must_change_password = mustChangePassword;
    }

    if (Object.keys(profilePatch).length > 0) {
      profilePatch.updated_at = new Date().toISOString();
      const { error: profUpdErr } = await admin
        .from("profiles")
        .update(profilePatch)
        .eq("id", targetId);

      if (profUpdErr) {
        console.error("Error updating profile in update-user-auth:", profUpdErr);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
