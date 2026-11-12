/*
 * Majic — installer translations
 */

package main

import (
	"os"
	"strings"
)

var strings_ = map[string]map[string]string{
	"en": {
		"title":           "Majic Installer",
		"noDiscord":       "No Discord install was found.",
		"found":           "Discord installs found:",
		"installed":       "Majic installed",
		"notInstalled":    "not installed",
		"chooseBranch":    "Choose a Discord install (number), or q to quit: ",
		"chooseAction":    "What do you want to do?",
		"actionInstall":   "Install or repair Majic",
		"actionUninstall": "Uninstall Majic",
		"actionCancel":    "Cancel",
		"choice":          "Your choice: ",
		"invalid":         "Invalid choice.",
		"closing":         "Closing %s...",
		"downloading":     "Downloading the latest Majic build...",
		"downloaded":      "Downloaded %s",
		"injecting":       "Installing Majic into %s...",
		"done":            "Done! Start %s again to use Majic.",
		"uninstalled":     "Majic was removed from %s.",
		"failed":          "Something went wrong: %v",
		"pressEnter":      "Press Enter to exit.",
		"unknownBranch":   "Unknown or missing Discord install: %s",
		"errOtherMod":     "another client mod is installed, uninstall it first",
		"errNotInstalled": "Majic is not installed",
		"errNotOurAsar":   "app.asar was not created by Majic, refusing to touch it",
		"errMissingAsset": "the latest release has no %s file",
	},
	"fr": {
		"title":           "Installeur Majic",
		"noDiscord":       "Aucune installation de Discord n'a été trouvée.",
		"found":           "Installations de Discord trouvées :",
		"installed":       "Majic installé",
		"notInstalled":    "non installé",
		"chooseBranch":    "Choisis une installation de Discord (numéro), ou q pour quitter : ",
		"chooseAction":    "Que veux-tu faire ?",
		"actionInstall":   "Installer ou réparer Majic",
		"actionUninstall": "Désinstaller Majic",
		"actionCancel":    "Annuler",
		"choice":          "Ton choix : ",
		"invalid":         "Choix invalide.",
		"closing":         "Fermeture de %s...",
		"downloading":     "Téléchargement de la dernière version de Majic...",
		"downloaded":      "%s téléchargé",
		"injecting":       "Installation de Majic dans %s...",
		"done":            "Terminé ! Relance %s pour utiliser Majic.",
		"uninstalled":     "Majic a été retiré de %s.",
		"failed":          "Une erreur s'est produite : %v",
		"pressEnter":      "Appuie sur Entrée pour quitter.",
		"unknownBranch":   "Installation de Discord inconnue ou introuvable : %s",
		"errOtherMod":     "un autre mod client est installé, désinstalle-le d'abord",
		"errNotInstalled": "Majic n'est pas installé",
		"errNotOurAsar":   "app.asar n'a pas été créé par Majic, je n'y touche pas",
		"errMissingAsset": "la dernière version ne contient pas le fichier %s",
	},
}

func systemLanguage() string {
	if locale := platformLocale(); locale != "" {
		return locale
	}
	for _, key := range []string{"LC_ALL", "LC_MESSAGES", "LANG"} {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return "en"
}

var language = func() string {
	if strings.HasPrefix(strings.ToLower(systemLanguage()), "fr") {
		return "fr"
	}
	return "en"
}()

func tr(key string) string {
	if text, ok := strings_[language][key]; ok {
		return text
	}
	return strings_["en"][key]
}
