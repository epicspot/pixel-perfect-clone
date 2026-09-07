import { toast } from "sonner";

/**
 * Gestion centralisée des erreurs.
 *
 * Tous les messages sont en français et destinés à l'utilisateur final :
 * un titre court + une explication concrète de ce qu'il peut faire.
 */

export interface FriendlyError {
  /** Titre court affiché en gras dans le toast / l'alerte. */
  title: string;
  /** Explication actionnable. */
  detail: string;
  /** Code technique éventuel (utile pour le support, jamais indispensable). */
  code?: string;
}

const asText = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

/** Extrait le code d'erreur (Postgres, Supabase, HTTP) d'un objet inconnu. */
const extractCode = (error: any): string => {
  const raw =
    error?.code ??
    error?.error_code ??
    error?.details?.code ??
    error?.error?.code ??
    error?.status ??
    "";
  return asText(raw);
};

/** Concatène tous les textes disponibles pour la détection par mots-clés. */
const extractMessage = (error: any): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  return [
    error.message,
    error.error_description,
    error.details,
    error.hint,
    error.error?.message,
  ]
    .map(asText)
    .filter(Boolean)
    .join(" | ");
};

interface Options {
  /** Titre par défaut si l'erreur n'est pas reconnue (ex: "Enregistrement impossible"). */
  fallbackTitle?: string;
  /** Explication par défaut si l'erreur n'est pas reconnue. */
  fallbackDetail?: string;
  /** Contexte métier ajouté aux messages génériques (ex: "la création du voyage"). */
  context?: string;
}

/**
 * Traduit n'importe quelle erreur (Postgres, authentification, réseau,
 * stockage, fonctions serveur) en message clair pour l'utilisateur.
 */
export function describeError(error: unknown, options: Options = {}): FriendlyError {
  const { fallbackTitle, fallbackDetail, context } = options;
  const code = extractCode(error);
  const raw = extractMessage(error);
  const msg = raw.toLowerCase();
  const withCode = (e: Omit<FriendlyError, "code">): FriendlyError => ({
    ...e,
    code: code || undefined,
  });

  // ---- Réseau / disponibilité ------------------------------------------
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    code === "ERR_NETWORK"
  ) {
    return withCode({
      title: "Connexion indisponible",
      detail:
        "Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.",
    });
  }
  if (msg.includes("timeout") || msg.includes("aborted") || code === "57014" || code === "504") {
    return withCode({
      title: "Délai dépassé",
      detail:
        "Le serveur a mis trop de temps à répondre. Réessayez dans quelques instants ou réduisez la période demandée.",
    });
  }
  if (code === "503" || code === "502" || msg.includes("service unavailable")) {
    return withCode({
      title: "Service momentanément indisponible",
      detail: "Le serveur est temporairement inaccessible. Réessayez dans une minute.",
    });
  }
  if (code === "429" || msg.includes("too many requests") || msg.includes("rate limit")) {
    return withCode({
      title: "Trop de tentatives",
      detail: "Patientez une minute avant de recommencer.",
    });
  }

  // ---- Authentification / session --------------------------------------
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return withCode({
      title: "Identifiants incorrects",
      detail: "L'email ou le mot de passe ne correspond pas. Vérifiez puis réessayez.",
    });
  }
  if (msg.includes("email not confirmed")) {
    return withCode({
      title: "Email non confirmé",
      detail: "Confirmez votre adresse email à partir du message reçu, puis reconnectez-vous.",
    });
  }
  if (msg.includes("already registered") || msg.includes("user already exists")) {
    return withCode({
      title: "Compte déjà existant",
      detail: "Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
    });
  }
  if (msg.includes("password should be") || msg.includes("weak password")) {
    return withCode({
      title: "Mot de passe trop faible",
      detail: "Utilisez au moins 6 caractères, avec des lettres et des chiffres.",
    });
  }
  if (
    msg.includes("jwt expired") ||
    msg.includes("token is expired") ||
    msg.includes("refresh token") ||
    msg.includes("session missing") ||
    code === "401"
  ) {
    return withCode({
      title: "Session expirée",
      detail: "Votre session a expiré pour raison de sécurité. Reconnectez-vous pour continuer.",
    });
  }
  if (msg.includes("mfa") || msg.includes("invalid totp") || msg.includes("factor")) {
    return withCode({
      title: "Code de vérification invalide",
      detail: "Saisissez le code à 6 chiffres affiché par votre application d'authentification.",
    });
  }

  // ---- Droits d'accès ---------------------------------------------------
  if (
    code === "42501" ||
    code === "403" ||
    code === "PGRST301" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level") ||
    msg.includes("rls")
  ) {
    return withCode({
      title: "Accès refusé",
      detail:
        "Votre profil ne permet pas cette opération, ou les données appartiennent à une autre agence. Contactez un administrateur.",
    });
  }

  // ---- Contraintes de base de données -----------------------------------
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("already exists")) {
    return withCode({
      title: "Doublon détecté",
      detail:
        "Un enregistrement identique existe déjà (code, référence ou numéro en double). Modifiez la valeur en double.",
    });
  }
  if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign")) {
    return withCode({
      title: "Opération bloquée par des données liées",
      detail:
        "Cet élément est utilisé ailleurs (voyages, tickets, utilisateurs…). Supprimez ou réaffectez ces données avant de continuer.",
    });
  }
  if (code === "23502" || msg.includes("null value in column") || msg.includes("not-null")) {
    return withCode({
      title: "Champ obligatoire manquant",
      detail: "Un champ requis est vide. Complétez le formulaire puis réessayez.",
    });
  }
  if (code === "23514" || msg.includes("check constraint")) {
    return withCode({
      title: "Valeur non autorisée",
      detail: "Une des valeurs saisies est hors des limites permises. Vérifiez les montants et quantités.",
    });
  }
  if (code === "22P02" || msg.includes("invalid input syntax")) {
    return withCode({
      title: "Format invalide",
      detail: "Une valeur saisie n'a pas le bon format (nombre, date ou identifiant). Corrigez la saisie.",
    });
  }
  if (code === "22003" || msg.includes("out of range") || msg.includes("numeric field overflow")) {
    return withCode({
      title: "Valeur trop grande",
      detail: "Le montant ou le nombre saisi dépasse la limite autorisée.",
    });
  }
  if (code === "PGRST116" || msg.includes("no rows") || msg.includes("results contain 0 rows")) {
    return withCode({
      title: "Élément introuvable",
      detail: "Cet enregistrement n'existe plus ou a été supprimé. Actualisez la page.",
    });
  }
  if (code === "PGRST204" || msg.includes("could not find the") || msg.includes("schema cache")) {
    return withCode({
      title: "Donnée non reconnue",
      detail: "Le formulaire contient un champ inconnu du serveur. Actualisez la page puis réessayez.",
    });
  }
  if (code === "404" || msg.includes("not found")) {
    return withCode({
      title: "Ressource introuvable",
      detail: "L'élément demandé n'existe pas ou n'est plus accessible.",
    });
  }

  // ---- Stockage de fichiers ---------------------------------------------
  if (msg.includes("payload too large") || msg.includes("exceeded the maximum allowed size") || code === "413") {
    return withCode({
      title: "Fichier trop volumineux",
      detail: "Choisissez un fichier plus léger (2 Mo maximum).",
    });
  }
  if (msg.includes("mime type") || msg.includes("invalid file type")) {
    return withCode({
      title: "Type de fichier non accepté",
      detail: "Seules les images (PNG, JPG) sont autorisées.",
    });
  }
  if (msg.includes("bucket not found")) {
    return withCode({
      title: "Stockage indisponible",
      detail: "L'espace de stockage des fichiers n'est pas configuré. Contactez un administrateur.",
    });
  }

  // ---- Fonctions serveur -------------------------------------------------
  if (msg.includes("edge function") || msg.includes("non-2xx status")) {
    return withCode({
      title: "Traitement serveur interrompu",
      detail: "Le traitement automatique a échoué. Réessayez ; si le problème persiste, contactez un administrateur.",
    });
  }

  // ---- Repli --------------------------------------------------------------
  const contextPart = context ? ` lors de ${context}` : "";
  return withCode({
    title: fallbackTitle || "Une erreur est survenue",
    detail:
      fallbackDetail ||
      (raw
        ? raw
        : `L'opération a échoué${contextPart}. Réessayez, puis contactez un administrateur si cela se reproduit.`),
  });
}

/** Message court sur une seule ligne (utile pour les alertes inline). */
export function errorMessage(error: unknown, options: Options = {}): string {
  const { title, detail } = describeError(error, options);
  return `${title} — ${detail}`;
}

/** Affiche un toast d'erreur clair et journalise le détail technique. */
export function notifyError(error: unknown, options: Options | string = {}) {
  const opts = typeof options === "string" ? { fallbackTitle: options } : options;
  const friendly = describeError(error, opts);
  console.error("[erreur]", opts.context || "", error);
  toast.error(friendly.title, {
    description: friendly.detail,
    duration: 6000,
  });
  return friendly;
}

/** Indique qu'une session expirée nécessite une reconnexion. */
export function isSessionExpired(error: unknown): boolean {
  return describeError(error).title === "Session expirée";
}
