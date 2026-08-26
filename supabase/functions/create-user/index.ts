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
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      permissions?: string[];
      mustChangePassword?: boolean;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roleRaw = typeof body.role === "string" ? body.role.trim() : "user";
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    const mustChangePassword = Boolean(body.mustChangePassword);

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "E-mail, senha e nome são obrigatórios." }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const roleLc = roleRaw.toLowerCase();
    const roleStored =
      roleLc === "admin" ||
      roleLc === "administrador" ||
      roleLc === "administrator" ||
      roleLc === "master"
        ? "admin"
        : "user";

    const allPermissions = [
      "pagina_inicial",
      "gerar_catalogo",
      "novo_produto",
      "produtos",
      "configuracoes",
      "usuarios",
    ];

    const permissionsStored =
      roleStored === "admin" ? allPermissions : permissions.length > 0 ? permissions : ["gerar_catalogo"];

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

    const callerRoleLc = (profile?.role ?? "").toString().trim().toLowerCase();
    const isAdminRole =
      callerRoleLc === "admin" ||
      callerRoleLc === "administrador" ||
      callerRoleLc === "administrator" ||
      callerRoleLc === "master";
    const canManage =
      isAdminRole ||
      (Array.isArray(profile?.permissions) && profile.permissions.includes("usuarios"));

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden: Sem permissão para gerenciar usuários" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: roleStored,
      },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = created.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Utilizador criado sem id." }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert into profiles using service role
    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        name,
        email,
        role: roleStored,
        permissions: permissionsStored,
        must_change_password: mustChangePassword,
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      console.error("Error creating profile:", upsertErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        userId,
        user: {
          id: userId,
          name,
          email,
          role: roleStored,
          permissions: permissionsStored,
          mustChangePassword,
          createdAt: new Date().toISOString(),
        },
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
