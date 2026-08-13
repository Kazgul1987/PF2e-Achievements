import { createAchievementsGainedPayload, getAchievementIdsFromPayload, getRuntimeAchievement, displayMyNewAchievementInChat as displayAchievementChatById } from "./scripts/achievement-runtime.js";

const moduleId = "PF2e-Achievements";
const modulePath = `modules/${moduleId}`;
const settingsNamespace = "farchievements";
const SEEN_ACHIEVEMENTS_FLAG = "seenAchievements";


Hooks.once('init', function() {
	const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);
	game.settings.register(settingsNamespace, 'EnableAchievementPopup', {
        name: game.i18n.localize('Farchievements.Settings.EnableAchievementPopup.Text'),
        hint: game.i18n.localize('Farchievements.Settings.EnableAchievementPopup.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
    // New setting: Disable achievement banner
    game.settings.register(settingsNamespace, 'DisableAchievementBanner', {
        name: game.i18n.localize('Farchievements.Settings.DisableAchievementBanner.Text'),
        hint: game.i18n.localize('Farchievements.Settings.DisableAchievementBanner.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'showAchOnStartup', {
        name: game.i18n.localize('Farchievements.Settings.showAchOnStartup.Text'),
        hint: game.i18n.localize('Farchievements.Settings.showAchOnStartup.Hint'),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'EnableChatBarButton', {
        name: game.i18n.localize('Farchievements.Settings.EnableChatBarButton.Text'),
        hint: game.i18n.localize('Farchievements.Settings.EnableChatBarButton.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
		onChange: debouncedReload,
	});
	game.settings.register(settingsNamespace, 'EnableScoreboard', {
        name: game.i18n.localize('Farchievements.Settings.EnableScoreboard.Text'),
        hint: game.i18n.localize('Farchievements.Settings.EnableScoreboard.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
	});
	if (game.modules.get('confetti')?.active === true)
	game.settings.register(settingsNamespace, 'EnableConfettiSupport', {
        name: game.i18n.localize('Farchievements.Settings.EnableConfettiSupport.Text'),
		hint: game.i18n.localize('Farchievements.Settings.EnableConfettiSupport.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'EnableContextButton', {
        name: game.i18n.localize('Farchievements.Settings.EnableContextButton.Text'),
        hint: game.i18n.localize('Farchievements.Settings.EnableContextButton.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'OmniView', {
        name: game.i18n.localize('Farchievements.Settings.OmniView.Text'),
        hint: game.i18n.localize('Farchievements.Settings.OmniView.Hint'),
        scope: 'client',
        config: false,
		default: false,
		type: Boolean,
    });
	game.settings.register(settingsNamespace, 'ListView', {
        name: game.i18n.localize('Farchievements.Settings.ListView.Text'),
        hint: game.i18n.localize('Farchievements.Settings.ListView.Hint'),
        scope: 'world',
        config: true,
		default: false,
		type: Boolean,
    });
	game.settings.register(settingsNamespace, 'chatMessage', {
        name: game.i18n.localize('Farchievements.Settings.ChatMessage.Text'),
        hint: game.i18n.localize('Farchievements.Settings.ChatMessage.Hint'),
        scope: 'world',
        config: true,
		default: true,
		type: Boolean,
    });
	game.settings.register(settingsNamespace, 'loadPerPage', {
        name: game.i18n.localize('Farchievements.Settings.loadPerPage.Text'),
        hint: game.i18n.localize('Farchievements.Settings.loadPerPage.Hint'),
        scope: 'client',
        config: true,
		default: 50,
		type: Number,
		range: {
			min: 25,
			max: 150,
			step: 1
		}
    });
	game.settings.register(settingsNamespace, 'currentPage', {
        name: game.i18n.localize('Farchievements.Settings.currentPage.Text'),
        hint: game.i18n.localize('Farchievements.Settings.currentPage.Hint'),
        scope: 'client',
        config: false,
		default: 1,
		type: Number,
    });
	game.settings.register(settingsNamespace, 'collapsedGroups', {
        name: 'Collapsed achievement groups',
        hint: 'Stores collapsed achievement group ids',
        scope: 'client',
        config: false,
		default: [],
		type: Array,
    });
	game.settings.register(settingsNamespace, 'GameSettingsButton', {
        name: game.i18n.localize('Farchievements.Settings.GameSettingsButton.Text'),
        hint: game.i18n.localize('Farchievements.Settings.GameSettingsButton.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
		onChange: debouncedReload,
    });
	game.settings.register(settingsNamespace, 'AchievementWindowTitle', {
        name: game.i18n.localize('Farchievements.Settings.AchievementWindowTitle.Text'),
        hint: game.i18n.localize('Farchievements.Settings.AchievementWindowTitle.Hint'),
        scope: 'world',
        config: true,
        default: 'Your Achievements',
        type: String,
    });
	game.settings.register(settingsNamespace, 'PlayerBackColor', {
        name: game.i18n.localize('Farchievements.Settings.PlayerBackColor.Text'),
        hint: game.i18n.localize('Farchievements.Settings.PlayerBackColor.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'HideUnknown', {
        name: game.i18n.localize('Farchievements.Settings.HideUnknown.Text'),
        hint: game.i18n.localize('Farchievements.Settings.HideUnknown.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'UnknownName', {
        name: game.i18n.localize('Farchievements.Settings.UnknownName.Text'),
        hint: game.i18n.localize('Farchievements.Settings.UnknownName.Hint'),
        scope: 'world',
        config: true,
        default: 'Unknown Achievement',
        type: String,
    });
	game.settings.register(settingsNamespace, 'AlwaysShowName', {
        name: game.i18n.localize('Farchievements.Settings.AlwaysShowName.Text'),
        hint: game.i18n.localize('Farchievements.Settings.AlwaysShowName.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'UnknownDes', {
        name: game.i18n.localize('Farchievements.Settings.UnknownDes.Text'),
        hint: game.i18n.localize('Farchievements.Settings.UnknownDes.Hint'),
        scope: 'world',
        config: true,
        default: "",
        type: String,
    });
	game.settings.register(settingsNamespace, 'AlwaysShowDes', {
        name: game.i18n.localize('Farchievements.Settings.AlwaysShowDes.Text'),
        hint: game.i18n.localize('Farchievements.Settings.AlwaysShowDes.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'DescriptionOnHover', {
        name: game.i18n.localize('Farchievements.Settings.DescriptionOnHover.Text'),
        hint: game.i18n.localize('Farchievements.Settings.DescriptionOnHover.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'achamount', {
        name: game.i18n.localize('Farchievements.Settings.achamount.Text'),
        hint: game.i18n.localize('Farchievements.Settings.achamount.Hint'),
        scope: 'world',
        config: false,
        default: "3",
        type: String,
    });
	game.settings.register(settingsNamespace, 'standarticon', {
        name: game.i18n.localize('Farchievements.Settings.standarticon.Text'),
        hint: game.i18n.localize('Farchievements.Settings.standarticon.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/standardIcon.PNG`,
		type: String,
		filePicker: 'image',
    });	
	game.settings.register(settingsNamespace, 'standardBackground', {
        name: game.i18n.localize('Farchievements.Settings.standardBackground.Text'),
        hint: game.i18n.localize('Farchievements.Settings.standardBackground.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/farchievementslogo.png`,
		type: String,
		filePicker: 'image',
    });
	game.settings.register(settingsNamespace, 'bannerBackground', {
        name: game.i18n.localize('Farchievements.Settings.bannerBackground.Text'),
        hint: game.i18n.localize('Farchievements.Settings.bannerBackground.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/achievementbanner.jpg`,
		type: String,
		filePicker: 'image',
    });
	game.settings.register(settingsNamespace, 'bannerAnimation', {
        name: game.i18n.localize('Farchievements.Settings.bannerAnimation.Text'),
        hint: game.i18n.localize('Farchievements.Settings.bannerAnimation.Hint'),
        scope: 'world',
        config: true,
        default: "slidein",
        type: String,
		choices: {
			"slidein": "sliding banner (SFX: stinger)",
			"fadeOut": "fade out (SFX: sound)",
		},
    });
	game.settings.register(settingsNamespace, 'achievementStinger', {
        name: game.i18n.localize('Farchievements.Settings.achievementStinger.Text'),
		hint: game.i18n.localize('Farchievements.Settings.achievementStinger.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/standardStinger_by_JFarenheit.mp3`,
		type: String,
		filePicker: 'audio',
	});
	game.settings.register(settingsNamespace, 'achievementSound', {
        name: game.i18n.localize('Farchievements.Settings.achievementSound.Text'),
		hint: game.i18n.localize('Farchievements.Settings.achievementSound.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/mixkit-tile-game-reveal-960.mp3`,
		type: String,
		filePicker: 'audio',
	});
	game.settings.register(settingsNamespace, 'achievementStingerVolume', {
        name: game.i18n.localize('Farchievements.Settings.achievementStingerVolume.Text'),
        hint: game.i18n.localize('Farchievements.Settings.achievementStingerVolume.Hint'),
        scope: 'world',
        config: true,
        default: 0.1,
		type: Number,
		range: {
			min: 0,
			max: 1,
			step: 0.01
		}
    });
	game.settings.register(settingsNamespace, 'achievementSoundVolume', {
        name: game.i18n.localize('Farchievements.Settings.achievementSoundVolume.Text'),
        hint: game.i18n.localize('Farchievements.Settings.achievementSoundVolume.Hint'),
        scope: 'world',
        config: true,
        default: 0.1,
		type: Number,
		range: {
			min: 0,
			max: 1,
			step: 0.01
		}
    });
	game.settings.register(settingsNamespace, 'achpretext', {
        name: game.i18n.localize('Farchievements.Settings.achpretext.Text'),
        hint: game.i18n.localize('Farchievements.Settings.achpretext.Hint'),
        scope: 'world',
        config: true,
        default: "Achievement Gained: ",
        type: String,
    });
	game.settings.register(settingsNamespace, 'greyscale', {
        name: game.i18n.localize('Farchievements.Settings.greyscale.Text'),
        hint: game.i18n.localize('Farchievements.Settings.greyscale.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
	game.settings.register(settingsNamespace, 'mystery', {
        name: game.i18n.localize('Farchievements.Settings.mystery.Text'),
        hint: game.i18n.localize('Farchievements.Settings.mystery.Hint'),
        scope: 'world',
        config: true,
        default: `${modulePath}/mystery.jpg`,
		type: String,
		filePicker: 'image',
    });
	game.settings.register(settingsNamespace, 'achievementdata', {
        name: game.i18n.localize('Farchievements.Settings.AchievementData.Text'),
        hint: game.i18n.localize('Farchievements.Settings.AchievementData.Hint'),
        scope: 'world',
		config: false,
		default: "1:::Mounted////icons/sundries/misc/horseshoe-iron.webp////Acquire a mount.;;;2:::Translator////icons/sundries/scrolls/scroll-bound-blue-white.webp////Act as the party translator.;;;3:::Argumenter////icons/commodities/bones/beak-orange-green.webp////Argue with the DM over a dice roll.;;;4:::Bitte, Bitte Papa////icons/sundries/lights/candle-pillar-lit-yellow.webp////Ask a deity for a favor.;;;5:::Hardmode////icons/skills/wounds/injury-eyes-blood-red-pink.webp////Be deaf and blind simultaneously.;;;6:::You have no power here////icons/skills/wounds/injury-eyes-blood-red-pink.webp////Be ignored by the DM when citing rules.;;;7:::Special////icons/magic/unholy/silhouette-light-fire-blue.webp////Be the only person to roll 20 at a session;;;8:::Actor////icons/environment/people/spearfighter.webp////Beat a performance check while in disguise;;;9:::Deiety////icons/magic/holy/barrier-shield-winged-blue.webp////Become deified.;;;10:::Brute////icons/magic/earth/barrier-stone-brown-green.webp////Burst through a wall.;;;11:::Ouch////icons/skills/wounds/bone-broken-marrow-red.webp////Reach 0 HP twice in 1 encounter.;;;12:::Amazing Roleplayer////icons/skills/social/diplomacy-peace-alliance.webp////Roleplay your character exceptionally.;;;13:::(Un)advantage////icons/magic/control/voodoo-doll-pain-damage-purple.webp////Roll 2 1’s on an advantaged roll.;;;14:::Lucky////icons/magic/light/projectile-flare-blue.webp////Roll 2 20’s in a row.;;;15:::Never tell me the odds////icons/magic/control/buff-luck-fortune-clover-green.webp////Roll 2 20’s on a disadvantaged roll.;;;16:::Strongest in the Land////icons/skills/melee/unarmed-punch-fist.webp////Have a strength score over 20.;;;17:::Fastest in the Land////icons/magic/lightning/bolt-strike-cloud-gray.webp////Have a dexterity score over 20.;;;18:::Toughest in the Land////icons/magic/earth/strike-fist-stone-light.webp////Have a constitution score over 20.;;;19:::Smartest in the Land////icons/magic/control/silhouette-hold-beam-blue.webp////Have a intelligence score over 20.;;;20:::Wisest in the Land////icons/magic/nature/tree-elm-roots-brown.webp////Have a wisdom score over 20.;;;21:::The most Charming in the Land////icons/magic/unholy/strike-body-explode-disintegrate.webp////Have a charisma score over 20.;;;22:::I have nothing left to lose...////icons/magic/death/undead-skeleton-deformed-red.webp////...so the only path to choose is twisted. Be the sole survivor of a TPK;;;23:::Necromancer////icons/commodities/bones/bones-dragon-grey.webp////Raise the dead.;;;24:::Lorax////https://c.tenor.com/BzpCcZbxOAIAAAAd/lorax-the-lorax.gif////Speak for the trees;;;",
        type: String,
    });
	game.settings.register(settingsNamespace, 'achievementdataNEW', {
        name: game.i18n.localize('Farchievements.Settings.achievementdataNEW.Text'),
        hint: game.i18n.localize('Farchievements.Settings.achievementdataNEW.Hint'),
        scope: 'world',
		config: true,
		default: '',
        type: String,
    });
	game.settings.register(settingsNamespace, 'clientdataSYNC', {
        name: game.i18n.localize('Farchievements.Settings.ClientDataList.Text'),
        hint: game.i18n.localize('Farchievements.Settings.ClientDataList.Hint'),
        scope: 'world',
		config: false,
        default: "",
        type: String,
    });
	game.settings.register(settingsNamespace, 'clientdata', {
        name: game.i18n.localize('Farchievements.Settings.ClientData.Text'),
        hint: game.i18n.localize('Farchievements.Settings.ClientData.Hint'),
        scope: 'client',
        config: false,
        default: "",
        type: String,
    });
	game.settings.register(settingsNamespace, 'loadSettingsForPlayer', {
        name: game.i18n.localize('Farchievements.Settings.loadSettingsForPlayer.Text'),
        hint: game.i18n.localize('Farchievements.Settings.loadSettingsForPlayer.Hint'),
        scope: 'client',
        config: false,
        default: "",
        type: String,
    });
	game.settings.register(settingsNamespace, 'lastSearchTerm', {
		name: 'Farchievements.Settings.lastSearchTerm.Text',
		hint: 'this will hold the last searched term for the search functionality, this will reset when the screen is opened',
		scope: 'client',
		config: false,
		default: "",
		type: String,
	});
	
	game.settings.register(settingsNamespace, 'lastSortType', {
		name: 'Farchievements.Settings.lastSortType.Text',
		hint: 'this will hold the sort type for the sort functionality',
		scope: 'client',
		config: false,
		default: "nameAsc",
		type: String,
	});	
	game.settings.register(settingsNamespace, 'activeTab', {
		name: 'Farchievements.Settings.activeTab.Text',
		hint: 'this will hold the active tab for the achievement view',
		scope: 'client',
		config: false,
		default: "campaign",
		type: String,
	});

	console.log("Initialised Farchievements");
});
class Achievements {
    static addChatControl() {
		if(game.version < 13){
			if(!game.settings.get(settingsNamespace, 'EnableChatBarButton'))
				return;
			let chatControlLeft = document.getElementsByClassName("chat-control-icon")[0];
			let tableNode = document.getElementById("achievements-button");

			if (chatControlLeft && !tableNode) {
				const chatControlLeftNode = chatControlLeft.firstElementChild;
				const number = 3;
				tableNode = document.createElement("label");
				tableNode.className = "AchievmentButtonLabel";
				tableNode.innerHTML = `<i id="achievements-button" class="fas fa-medal achievements-button" style="text-shadow: 0 0 1px black;"></i>`;
				tableNode.onclick = Achievements.initializeAchievements;
				chatControlLeft.insertBefore(tableNode, chatControlLeftNode);
				return;
			}
		}
		else{
			// V13
			let tabsFlexcol = document.getElementsByClassName("tabs")[0]?.getElementsByClassName("flexcol")[0];

			if (tabsFlexcol) {
				console.log("Farchievements | V13 Support");

				// Check if the button already exists
				if (!document.getElementById("achievements-button")) {
					let tableNode = document.createElement("button");
					tableNode.className = "AchievmentButtonLabelV13 ui-control plain icon";
					tableNode.innerHTML = `<i id="achievements-button" class="fas fa-medal achievements-button" style="text-shadow: 0 0 1px black;"></i>`;
					tableNode.onclick = Achievements.initializeAchievements;
					tabsFlexcol.append(tableNode);
				}
			}
		}
	}
    static initializeAchievements() {
        if (Achievements.AchievementsScreen === undefined) {
            Achievements.AchievementsScreen = new AchievementsScreen();
        }
        Achievements.AchievementsScreen.openDialog();
    } 
}
class AchievementsScreen extends Application {
	activateListeners(html) {
        super.activateListeners(html);
		this.activateDeleteAchievementListener(html);
		html.find('.SyncAch').click(event => {
		   //update the actor
		   ui.notifications.notify("SYNC");
		});
	}
	activateDeleteAchievementListener(html) {
		html.off('click.farchievementsDelete', '.deleteAchievement');
		html.on('click.farchievementsDelete', '.deleteAchievement', async (event) => {
			event.preventDefault();
			if (!game.user.isGM) {
				ui.notifications.warn(game.i18n.localize('Farchievements.Notification.DeleteGMOnly'));
				return;
			}

			const button = event.currentTarget;
			const achievementId = button.dataset.achievementId;

			try {
				if (!achievementId) throw new Error('The achievement ID is missing.');

				if (!window.PF2eAchievements.AchievementStore.getDefinition(achievementId)) throw new Error(`Achievement ${achievementId} was not found.`);

				button.disabled = true;
				try {
					await window.PF2eAchievements.AchievementStore.deleteAchievement(achievementId);
				} catch (error) {
					console.error(`${moduleId} | Failed to save achievement data after deletion:`, error);
					ui.notifications.error(game.i18n.localize('Farchievements.Notification.DeleteSaveFailed'));
					button.disabled = false;
					return;
				}
				await window.loadAchievementsEditMode();
			} catch (error) {
				button.disabled = false;
				console.error(`${moduleId} | Failed to delete achievement:`, error);
				ui.notifications.error(game.i18n.localize('Farchievements.Notification.DeleteFailed'));
			}
		});
	}
    openDialog() {
        //LOAD TEMPLATE DATA
        let $dialog = $('.achievementsscreen-window');
        if ($dialog.length > 0) {
            $dialog.remove();
            //return;
        }
        const templateData = {
            data: []
        };
        templateData.data = super.getData();
        templateData.title = "Farchievements";
		
        const templatePath = `${modulePath}/AchievementsScreen.html`;
		if(document.getElementsByClassName("achievementsscreen-window").length > 0){}
        AchievementsScreen.renderMenu(templatePath, templateData, this);

    }
    static renderMenu(path, data, achievementsScreen) {
        const dialogOptions = {
            width: 1050,
			heith: 630,
            top: 200,
            left: window.innerWidth/2 - 510,
            classes: ['achievementsscreen-window resizable']
        };
		dialogOptions.resizable = true;
        renderTemplate(path, data).then(dlg => {
			let achievementWindowTitle;
			try {
				achievementWindowTitle = game.settings.get(settingsNamespace, 'AchievementWindowTitle');
			} catch (err) {
				achievementWindowTitle = game.i18n.localize('Farchievements.Achievements') || 'Achievements';
			}
            new Dialog({
                title: achievementWindowTitle,
                content: dlg,
                buttons: {},
				render: html => achievementsScreen.activateDeleteAchievementListener(html)
            }, dialogOptions).render(true);
        });
    }
}
class AchievementSync{
	static sleep(ms){
	  return new Promise(resolve => setTimeout(resolve, ms));
	}
	static async _getSeen(){
		const store = window.PF2eAchievements.AchievementStore;
		// Prefer a server-side per-user flag (persists across world restarts and different browsers)
		let seen = await game.user.getFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG);
		if (Array.isArray(seen)) {
			const ids = seen.map(reference => store.resolveAchievementId(reference)).filter(Boolean);
			if (ids.length !== seen.length || ids.some((id, index) => id !== seen[index]))
				await game.user.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, ids);
			return ids;
		}
		// One-time migration from legacy client setting (string)
		const legacy = game.settings.get(settingsNamespace, 'clientdata');
		if (typeof legacy === 'string' && legacy.length) {
			seen = legacy.split('||||%%%||||').filter(Boolean)
				.map(reference => store.resolveAchievementId(reference)).filter(Boolean);
			await game.user.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, seen);
			return seen;
		}
		await game.user.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, []);
		return [];
	}
	static async _markSeen(achievementIds){
		const list = (achievementIds ?? []).filter(Boolean);
		if (!list.length) return;
		const existing = await AchievementSync._getSeen();
		const merged = Array.from(new Set([...existing, ...list]));
		await game.user.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, merged);
		// Keep legacy client setting roughly in sync for backwards compatibility
		try {
			await game.settings.set(settingsNamespace, 'clientdata', merged.join('||||%%%||||') + '||||%%%||||');
		} catch (err) { /* ignore */ }
	}
	static async PlayAnimation(payload) {
		const store = window.PF2eAchievements.AchievementStore;
		const achievementIdsToGain = getAchievementIdsFromPayload(payload, store);
		// Mark as "seen" immediately to avoid replay on reconnect/reload
		await AchievementSync._markSeen(achievementIdsToGain);
	
		let showPopup = game.settings.get(settingsNamespace, 'EnableAchievementPopup');
		let disableBanner = game.settings.get(settingsNamespace, 'DisableAchievementBanner');
		
		for (const achievementId of achievementIdsToGain) {
			await AchievementSync.sleep(100);
			const AchievementToGain = store.getDefinition(achievementId);
			if (!AchievementToGain) {
				console.warn(`${moduleId} | Cannot play achievement animation; unknown achievement ID`, achievementId);
				continue;
			}
			await displayMyNewAchievementInChat(achievementId);
	
			// Show Popup if enabled
			if (showPopup) {
				Farchievements.DisplayAchievementPopup(achievementId);
			}
	
			// Skip banner if disabled
			if (disableBanner) continue;
	
			// Banner animation logic
			let name = AchievementToGain.name;
			let icon = AchievementToGain.image || game.settings.get(settingsNamespace, 'standarticon');
			let anim = game.settings.get(settingsNamespace, 'bannerAnimation');
			let dur = (anim == "fadeOut") ? 5 : 13;
	
			document.getElementsByClassName("AchievementText")[0].innerHTML = `<label class="AchievementTextLabel">${game.settings.get(settingsNamespace, "achpretext")}</label>` + name;
			document.getElementById("AchievementIMG").src = icon;
	
			if (AchievementToGain.glowing)
				document.getElementById("FoundryAchievements").classList.add('glowingAch');
			else
				document.getElementById("FoundryAchievements").classList.remove('glowingAch');
	
			document.getElementById("Achievementbar").style.setProperty("animation-name", anim);
			document.getElementById("Achievementbar").style.setProperty("animation-duration", `${dur}s`);
			
			let sound = (anim == "fadeOut") ? 'achievementSound' : 'achievementStinger';
			let volume = (anim == "fadeOut") ? 'achievementSoundVolume' : 'achievementStingerVolume';
			await AudioHelper.play({ src: game.settings.get(settingsNamespace, sound), volume: game.settings.get(settingsNamespace, volume), autoplay: true, loop: false }, false);
	
			if (anim == "slidein") await AchievementSync.sleep(1800);
			document.getElementById("Achievementbar").style.setProperty("display", "flex");
	
			if (game.modules.get('confetti')?.active === true && game.settings.get(settingsNamespace, 'EnableConfettiSupport')) {
				for (let c = 0; c < 3; c++) {
					await AchievementSync.sleep(500);
					const strength = window.confetti.confettiStrength.high;
					const shootConfettiProps = window.confetti.getShootConfettiProps(strength);
					window.confetti.handleShootConfetti(shootConfettiProps);
				}
			} else {
				await AchievementSync.sleep(dur * 1000);
			}
			document.getElementById("Achievementbar").style.setProperty("display", "none");
		}
	}
	static async SyncAchievements(skip = null, start = false){
		//console.log("SYNC Achievements");//DEBUG
		if(game.user.isGM){
			if(!game.ready) return; //IF GAME IS READY, ELSE CHANGES WOULDN'T BE SAVED
			//CHECK FOR NEW USERS
			if(document.getElementById('SyncAchUnsaved') != null){
				document.getElementById('SyncAchUnsaved').id = "SyncAch";
			}
			return;
		}
		else{//IF USER IS PLAYER
			//FOR EACH ACHIEVEMENT IF NOT IN CLIENTDATA PLAY ANIMATION AND ADD IT
			let AchievementList = window.PF2eAchievements.AchievementStore.getLegacyView();
			let existingAchievements = await AchievementSync._getSeen();
			const achievementIdsToPlay = [];
			
			AchievementList.forEach(function (achievement, index) {
				if (achievement.players && achievement.players.includes(game.user.id)) {
					if (existingAchievements.includes(achievement.id)) return;
					achievementIdsToPlay.push(achievement.id);
				}
			});
			if(achievementIdsToPlay.length){
				const payload = createAchievementsGainedPayload(achievementIdsToPlay, game.user.id);
				let amount = achievementIdsToPlay.length;
				if(skip == true){
					await AchievementSync._markSeen(achievementIdsToPlay);
					return;
				}
				if(start && amount > 0){
					let d = new Dialog({
						title: `${game.i18n.localize('Farchievements.Html.SanitySaver.Title')}`,
						content: `${game.i18n.localize('Farchievements.Html.SanitySaver.Body1')} ` + amount + `${game.i18n.localize('Farchievements.Html.SanitySaver.Body2')}`,
						buttons: {
							one: {
								icon: '<i class="fas fa-check"></i>',
								label: `${game.i18n.localize('Farchievements.Html.SanitySaver.ButtonSeeAll')}`,
								callback: () => AchievementSync.PlayAnimation(payload)
							},
							two: {
								icon: '<i class="fas fa-times"></i>',
								label: `${game.i18n.localize('Farchievements.Html.SanitySaver.ButtonSkip')}`,
								callback: async () => {
									await AchievementSync._markSeen(achievementIdsToPlay);
								}
							}
						}
					});
					d.render(true);
				}
				else{
					AchievementSync.PlayAnimation(payload);
				}
			}
			//PLAY LIST AS ANIMATION 
			//console.log(AchievementList);//DEBUG
				if(document.getElementById("AchievementScript")!= null)//IF USER IS ON THE ACHIEVEMENTSSCREEN, RELOAD IT
					document.getElementById("AchievementScript").onclick();
		}
	}
}
Hooks.on('renderSceneNavigation', async function() {
        Achievements.addChatControl();
        //console.log("AchievementsScreen GM true");
		let style = await game.settings.get(settingsNamespace, "bannerBackground");
		let banner = "";
		
		if(style != "")
			banner = "background: url("+style+")!important;";
		
		let bannerstyle = 'top: -200px; '+banner+' background-position: center!important; display: flex;  background-size: 100% 100% !important;';
		var el = `<div id="Achievementbar" style="display: none;" class="Achievementbar"><div id="FoundryAchievements" class="FoundryAchievementsBanner" style="`+bannerstyle+`"><img id="AchievementIMG" class="AchievementIMG" src="${modulePath}/standardIcon.PNG"></img><p class="AchievementText"><label class="AchievementTextLabel">${game.i18n.localize('Farchievements.NewAchievement')}</label> (${game.i18n.localize('Farchievements.Achievement')}) </p><i class="Shiny"></i></div></div>`;
		document.getElementById("notifications").innerHTML = el;
});

Hooks.on('createChatMessage', async (chatMessage) => {
    if (!game.user.isGM || !chatMessage.rolls?.length) return;

    const roll = chatMessage.rolls[0];
    const userId = chatMessage.user?.id;
    if (!userId) return;

    // PF2e totals include modifiers. Prefer the active die result for natural-roll
    // achievements and fall back to the total for roll shapes without dice data.
    const natural = roll.dice?.flatMap(die => die.results ?? [])
        .find(result => result.active !== false && !result.discarded)?.result;
    try {
        const result = await window.PF2eAchievements.AchievementStore.processDiceRoll({
            formula: roll.formula ?? "",
            total: roll.total,
            natural
        }, userId);
        if (result.unlocked.length) SendSyncMessage();
    } catch (error) {
        console.error(`${moduleId} | Failed to process dice achievements`, error);
        ui.notifications.error("PF2e Achievements: Dice achievement processing failed. See console for details.");
    }
});

Hooks.on('ready', async function() {
	//START MIGRATION
	if (game.user.isGM) {
		try {
			await window.PF2eAchievements.migrateAchievements();
			await window.PF2eAchievements.migrateLegacySeenFlags();
		} catch (error) {
			console.error(`${moduleId} | Achievement migration failed`, error);
			ui.notifications.error("PF2e Achievements: Die Datenmigration ist fehlgeschlagen. Die Legacy-Daten wurden nicht verändert; Details stehen in der Konsole.", { permanent: true });
			return;
		}
	}
	//sync achievements
	if(!game.user.isGM)
		AchievementSync.SyncAchievements(game.settings.get(settingsNamespace, 'showAchOnStartup'), true);
});
Hooks.on('renderSettings', function() {
	//ADD BUTTON TO SETTINGS
	function refreshData(){
		let x = 0.1;  // 0.1 seconds
		if(document.getElementById("FarchievementsSettings") == null && game.settings.get(settingsNamespace, 'GameSettingsButton')){
			$('#settings-game').append(`<div id="FarchievementsSettings" style="margin:0;"><h4>Farchievements</h4><button id="SettingsAchievementsButton" data-action="Achievements"><i class="fas fa-medal achievements-button"></i>${game.i18n.localize('Farchievements.Achievements')}</button></div>`);
			let AchievementsButton = document.getElementById("SettingsAchievementsButton");
			if(AchievementsButton != null)
			AchievementsButton.onclick = Achievements.initializeAchievements;
		}
		// Do your thing here
		//ui.notifications.notify("Test");
		if(document.getElementsByClassName("context-items")[0] != null){
			if(document.getElementById("contextAchievement") == null){
				if(document.getElementsByClassName("context-items")[0].closest('.player') != null){
					let id = document.getElementsByClassName("context-items")[0].closest('.player').getAttribute("data-user-id");
					if(id != game.user.id && game.user.isGM){//You can't open your own achievements
						$(".context-items").append(`<li class="context-item" id="contextAchievement"><i class="fas fa-medal"></i> ${game.i18n.localize('Farchievements.ViewAchievements')}</li>`);
						let AchievmentContextButton = document.getElementById("contextAchievement");
						game.settings.set(settingsNamespace, 'loadSettingsForPlayer', id);
						AchievmentContextButton.onclick = Achievements.initializeAchievements;
					}
				}
			}
		}
		setTimeout(refreshData, x*1000);
	}

	if(game.user.isGM){
		function WaitForReady(){
			let x = 0.1;  // 0.1 seconds
			// Do your thing here
			if(game.ready == true){
				AchievementSync.SyncAchievements();
			}
			else
			setTimeout(WaitForReady, x*1000);
		}
		WaitForReady();
	}

	if(game.version < 13) //IF < Version 13 use search algorithm
		refreshData();
	//else look onReady
});
Hooks.on("createChatMessage", async function (message){
	if(message.content.includes('Achievements Synced'))
	AchievementSync.SyncAchievements();

if(message.content.includes("Farchievements-SyncRequest")){
	if (!game.user.isGM) return;
	const [, playerName = "", suppliedName = ""] = message.content.split("|");
	const player = playerName ? game.users.getName(playerName) : game.user;
	if (!player) {
		ui.notifications.error(game.i18n.localize('Farchievements.Notification.Prefix') + game.i18n.localize('Farchievements.Notification.UserDoesNotExist'));
		return;
	}
	try {
		await addAchievementFromCommand(suppliedName, player.id);
	} catch (error) {
		console.error(`${moduleId} | Sync request failed`, error);
		ui.notifications.error(error.message);
	}
}});
window.farchievements_DEBUG_Reset_To_Defaults = async function resetToDefaults(){
	if(!game.user.isGM) return;
	await game.settings.set(settingsNamespace, 'achievementdata', "1:::Mounted////systems/dnd5e/icons/items/inventory/horseshoe.jpg////Acquire a mount.;;;2:::Translator////systems/dnd5e/icons/items/inventory/note-scroll.jpg////Act as the party translator.;;;3:::Argumenter////systems/dnd5e/icons/items/inventory/monster-beak.jpg////Argue with the DM over a dice roll.;;;4:::Bitte, Bitte Papa////systems/dnd5e/icons/items/inventory/runestone-dwarven.jpg////Ask a deity for a favor.;;;5:::Hardmode////icons/skills/wounds/injury-eyes-blood-red-pink.webp////Be deaf and blind simultaneously.;;;6:::You have no power here////systems/dnd5e/icons/skills/blood_12.jpg////Be ignored by the DM when citing rules.;;;7:::Special////systems/dnd5e/icons/skills/green_27.jpg////Be the only person to roll 20 at a session;;;8:::Actor////systems/dnd5e/icons/skills/emerald_07.jpg////Beat a performance check while in disguise;;;9:::Deiety////systems/dnd5e/icons/skills/yellow_13.jpg////Become deified.;;;10:::Brute////icons/magic/earth/barrier-stone-brown-green.webp////Burst through a wall.;;;11:::Ouch////https://assets.forge-vtt.com/5fa2d7054f8a4cf1b34c8a38/Icons/spellbook_page1/SpellBook08_13.png////Reach 0 HP twice in 1 encounter.;;;12:::Amazing Roleplayer////icons/skills/social/diplomacy-peace-alliance.webp////Roleplay your character exceptionally.;;;13:::(Un)advantage////icons/magic/control/voodoo-doll-pain-damage-purple.webp////Roll 2 1’s on an advantaged roll.;;;14:::Lucky////icons/magic/light/projectile-flare-blue.webp////Roll 2 20’s in a row.;;;15:::Never tell me the odds////icons/magic/control/buff-luck-fortune-clover-green.webp////Roll 2 20’s on a disadvantaged roll.;;;16:::Strongest in the Land////icons/skills/melee/unarmed-punch-fist.webp////Have a strength score over 20.;;;17:::Fastest in the Land////icons/magic/lightning/bolt-strike-cloud-gray.webp////Have a dexterity score over 20.;;;18:::Toughest in the Land////icons/magic/earth/strike-fist-stone-light.webp////Have a constitution score over 20.;;;19:::Smartest in the Land////icons/magic/control/silhouette-hold-beam-blue.webp////Have a intelligence score over 20.;;;20:::Wisest in the Land////icons/magic/nature/tree-elm-roots-brown.webp////Have a wisdom score over 20.;;;21:::The most Charming in the Land////icons/magic/unholy/strike-body-explode-disintegrate.webp////Have a charisma score over 20.;;;22:::I've nothing left to lose...////icons/magic/death/undead-skeleton-deformed-red.webp////...so the only path to choose is twisted. Be the sole survivor of a TPK;;;23:::Necromancer////icons/commodities/bones/bones-dragon-grey.webp////Raise the dead.;;;24:::Lorax////https://c.tenor.com/BzpCcZbxOAIAAAAd/lorax-the-lorax.gif////Speak for the trees;;;");
	await game.settings.set(settingsNamespace, 'achievementdataNEW',"");
	await game.settings.set(settingsNamespace, 'clientdataSYNC',"");
	await game.settings.set(settingsNamespace, 'clientdata', "");
	await window.PF2eAchievements.AchievementStore.resetAll();
	await game.settings.set(settingsNamespace, 'achievementSchemaVersion', 1);
	await window.PF2eAchievements.migrateAchievements();
	// Also clear per-user "seen" flags
	for (const u of game.users.contents) {
		await u.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, []);
	}
}
window.farchievements_DEBUG_Reset_To_Empty = async function resetToEmpty(){
	if(!game.user.isGM) return false;
	await window.PF2eAchievements.AchievementStore.resetAll();
	await game.settings.set(settingsNamespace, 'achievementdataNEW', "[]");
	await game.settings.set(settingsNamespace, 'achievementdata', "");
	await game.settings.set(settingsNamespace, 'clientdataSYNC', "");
	await game.settings.set(settingsNamespace, 'clientdata', "");
	for (const user of game.users.contents) await user.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, []);
	return true;
}
// Historical debug macro explicitly retains its old "restore defaults" behavior.
window.farchievements_DEBUG_Reset_EVERYTHING = window.farchievements_DEBUG_Reset_To_Defaults;
window.farchievements_DEBUG_Reset_PlayerAchievements = async function resetPlayers(){
	if(!game.user.isGM) return;
	await game.settings.set(settingsNamespace, 'clientdataSYNC',"");
	await game.settings.set(settingsNamespace, 'clientdata', "");
	// Also clear per-user \"seen\" flags
	for (const u of game.users.contents) {
		await u.setFlag(moduleId, SEEN_ACHIEVEMENTS_FLAG, []);
	}
	location.reload();
}
//PUBLICLY ACCESSIBLE FUNCTIONS		
window.Farchievements = class Farchievement{
	static Open (){
		$("#SettingsAchievementsButton").click()
	}
	static Render (){
		$("#SettingsAchievementsButton").click()
	}
	static async AddAchievement(AchievementName, PlayerName){
		if(!game.user.isGM) return false;
		const player = game.users.getName(PlayerName);
		if (!player) { ui.notifications.warn(`Player "${PlayerName}" not found.`); return false; }
		const achievementId = window.PF2eAchievements.AchievementStore.resolveAchievementId(AchievementName);
		if (!achievementId) { ui.notifications.warn(`Achievement "${AchievementName}" was not uniquely resolved.`); return false; }
		return this.unlock(achievementId, player.id);
	}
	static async unlock(achievementId, userId) {
		if (!game.user.isGM) return false;
		if (typeof achievementId !== "string" || typeof userId !== "string") { ui.notifications.warn("Achievement ID and user ID must be strings."); return false; }
		if (!window.PF2eAchievements.AchievementStore.getDefinition(achievementId)) { ui.notifications.warn(`Achievement "${achievementId}" not found.`); return false; }
		if (!game.users.get(userId)) { ui.notifications.warn(`User "${userId}" not found.`); return false; }
		await window.PF2eAchievements.AchievementStore.unlock(achievementId, userId);
		return true;
	}
	static async lock(achievementId, userId) {
		if (!game.user.isGM) return false;
		if (typeof achievementId !== "string" || typeof userId !== "string") { ui.notifications.warn("Achievement ID and user ID must be strings."); return false; }
		if (!window.PF2eAchievements.AchievementStore.getDefinition(achievementId)) { ui.notifications.warn(`Achievement "${achievementId}" not found.`); return false; }
		if (!game.users.get(userId)) { ui.notifications.warn(`User "${userId}" not found.`); return false; }
		await window.PF2eAchievements.AchievementStore.lock(achievementId, userId);
		return true;
	}
	static async RemoveAchievement(AchievementName, PlayerName) {
		if (!game.user.isGM) return;
	
		const player = game.users.getName(PlayerName);
		if (!player) { ui.notifications.warn(`Player "${PlayerName}" not found.`); return false; }
		const achievementId = window.PF2eAchievements.AchievementStore.resolveAchievementId(AchievementName);
		if (!achievementId) { ui.notifications.warn(`Achievement "${AchievementName}" was not uniquely resolved.`); return false; }
		await this.lock(achievementId, player.id);
	
		ui.notifications.notify(`Achievement "${AchievementName}" removed from player "${PlayerName}".`);
		return true;
	}	
	static async MigrateAchievements(){
		await ui.notifications.notify("Farchievements | Beginning migration of old data...");
		//console.log(game.settings.get(settingsNamespace, 'achievementdataNEW'));
		await game.settings.set(settingsNamespace, 'currentPage', 1);
		let oldData = game.settings.get(settingsNamespace, 'achievementdata');
		let oldDataArr = oldData.split(";;;");
		let oldClientData = game.settings.get(settingsNamespace, 'clientdataSYNC');
		let oldClientDataArr = oldClientData.split("||");
		let newData = "";
		let AchievementList = [];
		//console.log(oldDataArr.length);
		for(let i = 0; i < oldDataArr.length -1; i++){//FOR EVERY OLD ACHIEVEMENT
			//console.log(oldDataArr[i]);
			//constructor: name, description, image, players
			let playerslist = [];
			if(oldClientData != ""){
				for(let j = 0; j < oldClientDataArr.length -1; j++){//FOR EVERY CLIENT
					if(oldClientDataArr[j] == "")continue;
					if(oldClientDataArr[j].split(":")[1] == "")continue;
					
					let clientAchArray = oldClientDataArr[j].split(":")[1].split(",");
					for(let k = 0; k < clientAchArray.length-1; k++){//FOR EVERY ENTRY IN THE CLIENT ACHIEVEMENTS LIST
						if(clientAchArray[k] == i){
							playerslist.push(oldClientDataArr[j].split(":")[0]);
						}
					}
				}
			}
			
			let newAch = new Achievement(
				oldDataArr[i].split(":::")[1].split("////")[0],
				oldDataArr[i].split("////")[2],
				oldDataArr[i].split("////")[1],
				1,
				false,
				"#f7ff9e",
				playerslist,
				[],
				{},
				0,
				"standard",
				{},
				2,
				"d20",
				"",
				"",
				""
			);
			if(AchievementList.find(ach => ach.name == newAch.name)){
				var number = AchievementList.filter(ach => ach.name.includes(newAch.name)).length
				newAch.name += "("+number+")"
			}
			//console.log(newAch);
			AchievementList.push(newAch);
		}
		//console.log(game.settings.get(settingsNamespace, 'achievementdataNEW'));
		let data = JSON.stringify(AchievementList);
		//console.log(data);
		//let TestData = JSON.parse(data);
		await game.settings.set(settingsNamespace, 'achievementdataNEW', data);
		await ui.notifications.notify("Farchievements | Migration Finished");

	}
	static async debugAchievements(){
		return window.PF2eAchievements.AchievementStore.getLegacyView();
	}
}
window.Farchievements.DisplayAchievementPopup = function (achievementId, playerId = "") {
    const definition = getRuntimeAchievement(achievementId, window.PF2eAchievements.AchievementStore, console.warn, "display achievement popup");
    if (!definition) {
        ui.notifications.warn(`Farchievements | Achievement ID '${achievementId}' not found.`);
        return false;
    }
    const achievement = definition;
    const player = playerId ? game.users.get(playerId) : game.user;
    if (!player) {
        ui.notifications.warn(`Farchievements | Player with ID '${playerId}' not found.`);
        return false;
    }
    const playerState = window.PF2eAchievements.AchievementStore.getPlayerState(achievementId, player.id);
    if (!playerState.unlocked && !game.user.isGM) {
        ui.notifications.warn(`Farchievements | Player '${player.name}' does not have this achievement.`);
        return false;
    }
    const receivedDate = playerState.unlockedAt ? new Date(playerState.unlockedAt) : null;
    const formattedDate = receivedDate
        ? receivedDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : null;

    let popupContent = `
        <div class="farchievements-popup" style="
            position: relative; 
            text-align: center; 
            padding: 20px; 
            border-radius: 10px;
            background: url('${achievement.image}') center/cover no-repeat;
            border: 3px solid ${achievement.color};
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgb(0 0 0 / 84%);
                backdrop-filter: blur(15px);
                border-radius: 10px;
            "></div>
            <img class="farchievements-popup-img" src="${achievement.image}" alt="${achievement.name}" style="
                width: 100px; 
                height: 100px; 
                display: block; 
                margin: auto; 
                border-radius: 10px; 
                border: 1px solid ${achievement.color};
                position: relative;
            ">
            <h2 class="farchievements-popup-title" style="
                margin-top: 10px; 
                color: ${achievement.color};
                position: relative;
            ">${achievement.name}</h2>
            <p class="farchievements-popup-description" style="
                margin-top: 5px; 
                color: white;
                position: relative;
            ">${achievement.description}</p>
            ${formattedDate ? `
            <p class="farchievements-popup-date" style="
                margin-top: 10px; 
                color: white;
                font-size: 0.9em;
                position: relative;
            "><b>Received:</b> ${formattedDate}</p>` : ""}
        </div>
    `;

    let dialogButtons = {
        close: {
            label: "Close",
            callback: () => {}
        }
    };

    if (game.user.isGM) {
        dialogButtons.unlockForAll = {
            label: game.i18n.localize('Farchievements.Dialog.UnlockForAll'),
            callback: () => {
                Dialog.confirm({
                    title: game.i18n.localize('Farchievements.Dialog.UnlockForAllTitle'),
                    content: game.i18n.format('Farchievements.Dialog.UnlockForAllContent', { achievement: achievement.name }),
                    yes: async () => {
                        if (!window.PF2eAchievements.AchievementStore.getDefinition(achievement.id)) {
                            ui.notifications.warn(`Farchievements | Achievement ID '${achievement.id}' not found.`);
                            return;
                        }
                        const targetIds = game.users.filter(user => !user.isGM).map(user => user.id);
                        await window.PF2eAchievements.AchievementStore.unlockMany(achievement.id, targetIds);
                        SendSyncMessage();
                        ui.notifications.notify(game.i18n.localize('Farchievements.Notification.UnlockForAll'));
                    }
                });
            }
        };
        dialogButtons.unlockForPlayers = {
            label: game.i18n.localize('Farchievements.Dialog.UnlockForPlayers'),
            callback: () => {
                let targetUsers = game.users.filter(user => !user.isGM);
                if (!targetUsers.length) {
                    ui.notifications.warn(game.i18n.localize('Farchievements.Dialog.UnlockForPlayersNone'));
                    return;
                }

                let activePlayerId = typeof getActivePlayer === "function" ? getActivePlayer() : null;
                let playerOptions = targetUsers
                    .map(user => {
                        let checked = activePlayerId === user.id ? "checked" : "";
                        return `<label style="display: block; margin: 4px 0;">
                            <input type="checkbox" name="playerIds" value="${user.id}" ${checked}> ${user.name}
                        </label>`;
                    })
                    .join("");

                new Dialog({
                    title: game.i18n.localize('Farchievements.Dialog.UnlockForPlayersTitle'),
                    content: `<form>
                        <div style="max-height: 240px; overflow-y: auto;">
                            ${playerOptions}
                        </div>
                    </form>`,
                    buttons: {
                        confirm: {
                            label: game.i18n.localize('Farchievements.Dialog.UnlockForPlayersConfirm'),
                            callback: async (html) => {
                                let selectedIds = Array.from(html[0].querySelectorAll('input[name="playerIds"]:checked'))
                                    .map(input => input.value);

                                if (!selectedIds.length) {
                                    ui.notifications.warn(game.i18n.localize('Farchievements.Dialog.UnlockForPlayersEmpty'));
                                    return;
                                }

                                if (!window.PF2eAchievements.AchievementStore.getDefinition(achievement.id)) {
                                    ui.notifications.warn(`Farchievements | Achievement ID '${achievement.id}' not found.`);
                                    return;
                                }
                                const validIds = selectedIds.filter(userId => game.users.get(userId) && !game.users.get(userId).isGM);
                                await window.PF2eAchievements.AchievementStore.unlockMany(achievement.id, validIds);
                                SendSyncMessage();
                                ui.notifications.notify(game.i18n.localize('Farchievements.Notification.UnlockForPlayers'));
                            }
                        },
                        cancel: {
                            label: game.i18n.localize('Farchievements.Dialog.Cancel')
                        }
                    }
                }).render(true);
            }
        };
    }

    new Dialog({
        title: "Achievement Unlocked!",
        content: popupContent,
        buttons: dialogButtons
    }).render(true);
};


function resolveCommandAchievement(supplied) {
	const definitions = window.PF2eAchievements.AchievementStore.getDefinitions();
	const id = window.PF2eAchievements.AchievementStore.resolveAchievementId(supplied);
	if (id) return window.PF2eAchievements.AchievementStore.getDefinition(id);
	// Compatibility: the historical public command accepted a name or zero-based index.
	if (Number.isInteger(Number(supplied)) && definitions[Number(supplied)]) return definitions[Number(supplied)];
	return undefined;
}
async function addAchievementFromCommand(achievementId, userId) {
	const user = game.users.get(userId);
	if (!user) throw new Error(`Farchievements | Unknown user ${userId}`);
	const achievement = resolveCommandAchievement(achievementId);
	if (!achievement) throw new Error(`Farchievements | Unknown achievement ${achievementId}`);
	await window.PF2eAchievements.AchievementStore.unlock(achievement.id, user.id);
	SendSyncMessage();
}
async function removeAchievementFromCommand(achievementId, userId) {
	const user = game.users.get(userId);
	if (!user) throw new Error(`Farchievements | Unknown user ${userId}`);
	const achievement = resolveCommandAchievement(achievementId);
	if (!achievement) throw new Error(`Farchievements | Unknown achievement ${achievementId}`);
	await window.PF2eAchievements.AchievementStore.lock(achievement.id, user.id);
	SendSyncMessage();
}
async function displayMyNewAchievementInChat(achievementId){
	return displayAchievementChatById(achievementId, {
		store: window.PF2eAchievements.AchievementStore,
		chatMessage: ChatMessage,
		enabled: game.settings.get(settingsNamespace, 'chatMessage')
	});
}

Hooks.on("renderChatMessage", (chatMessage, html, data) => {
    if (html.find(".achGainedChatText").length) {
        html.addClass("achievementChatDisplayMessage");
    }
});

Hooks.once('ready', () => {
	if(game.version < 13) return;
    function addSettingsButton() {
		console.log("FArchievementsADDSETTINGSBUTTON");
        if (!document.getElementById("FarchievementsSettings") && game.settings.get(settingsNamespace, 'GameSettingsButton')) {
            let settingsContainer = document.getElementsByClassName("settings flexcol")[0];

            if (settingsContainer) {
                let settingsDiv = document.createElement("div");
                settingsDiv.id = "FarchievementsSettings";
                settingsDiv.style.margin = "0";
                settingsDiv.innerHTML = `<h4>Farchievements</h4>
                    <button id="SettingsAchievementsButton" data-action="Achievements">
                        <i class="fas fa-medal achievements-button"></i> ${game.i18n.localize('Farchievements.Achievements')}
                    </button>`;

                settingsContainer.appendChild(settingsDiv);

                let AchievementsButton = document.getElementById("SettingsAchievementsButton");
                if (AchievementsButton) {
                    AchievementsButton.onclick = Achievements.initializeAchievements;
                }
            }
        }
    }

    function addContextButton() {
        let contextMenu = document.getElementsByClassName("context-items")[0];

        if (contextMenu && !document.getElementById("contextAchievement")) {
            let playerElement = contextMenu.closest('.player');

            if (playerElement) {
                let id = playerElement.getAttribute("data-user-id");

                if (id !== game.user.id && game.user.isGM) { // Ensure it's not the user's own achievements
                    let contextItem = document.createElement("li");
                    contextItem.className = "context-item";
                    contextItem.id = "contextAchievement";
                    contextItem.innerHTML = `<i class="fas fa-medal"></i> ${game.i18n.localize('Farchievements.ViewAchievements')}`;

                    contextItem.onclick = () => {
                        game.settings.set(settingsNamespace, 'loadSettingsForPlayer', id);
                        Achievements.initializeAchievements();
                    };

                    contextMenu.appendChild(contextItem);
                }
            }
        }
    }

    function refreshData() {
        addContextButton();
        setTimeout(refreshData, 100); // Runs every 0.1 seconds
    }

    addSettingsButton(); // Runs once
    refreshData(); // Starts periodic execution for context menu updates
});



async function SendSyncMessage() {
	ChatMessage.create({
		user: game.user._id,
		content: "Achievements Synced",
		blind: false,
		whisper: game.users.filter(u => u.isGM).map(u => u.id)
	});

	if(document.getElementById('achsyncnormalmode') != null)
		if (document.getElementById('achsyncnormalmode').innerHTML != "") 
			document.getElementById('achsyncnormalmode').innerHTML = "";
}

class Achievement {
    constructor(
        name,
		description,
		image,
		points = 1,
		glowing = false,
		color = "#f7ff9e",
		players,
		seenBy = [],
		playerDates = {},
        progressRequired = 0,
		progressType = "standard",
		playerProgress = {},
		chainLength = 2,
		diceType = "d20",
		campaign = "",
		adventure = "",
		chapter = ""
    ) {
        this.name = name;
        this.description = description;
        this.image = image;
		this.points = points;
		this.glowing = glowing;
		this.color = color;
        this.players = players;
        this.seenBy = seenBy;
        this.playerDates = playerDates;
        this.progressRequired = progressRequired;
        this.progressType = progressType;
        this.playerProgress = playerProgress; // Track player progress, used for both standard and chain
		this.diceType = diceType;
		this.chainLength = chainLength; //The Amount of times a player needs to roll the value required for a chain
		this.campaign = campaign;
		this.adventure = adventure;
		this.chapter = chapter;
    }

    // Method to add progress for a player
    addProgress(playerId, progress, isChain = false) {
        if (!this.playerProgress[playerId]) {
            this.playerProgress[playerId] = 0; // Initialize player's progress if it doesn't exist
        }

        if (isChain) {
            // Handle chain progress
            if (progress) {
                this.playerProgress[playerId] += 1; // Increment chain on success
                console.log(`Farchievements | Chain progress for player ${playerId}: ${this.playerProgress[playerId]}`);
                
                if (this.playerProgress[playerId] >= this.progressRequired) {
                    this.addPlayer(playerId); // Award achievement if chain is complete
                    this.playerProgress[playerId] = 0; // Reset chain after achievement
                }
            } else {
                this.playerProgress[playerId] = 0; // Reset chain on failure
                console.log(`Farchievements | Chain reset for player ${playerId}`);
            }
        } else {
            // Standard progress
            this.playerProgress[playerId] = Math.max(0, Math.min(this.playerProgress[playerId] + progress, this.progressRequired));

            // Check if the progress is equal to or greater than the required progress
            if (this.playerProgress[playerId] >= this.progressRequired) {
                this.addPlayer(playerId);
				SendSyncMessage();
            } else if (this.playerProgress[playerId] < this.progressRequired) {
                // If the progress is below the required progress, remove the player from the achievement
                this.removePlayer(playerId);
            }

            console.log(`Farchievements | Updated progress for player: ${playerId}, new progress: ${this.playerProgress[playerId]}`);
        }
    }

    // Method to check progress for a player
    getProgress(playerId) {
        return this.playerProgress[playerId] || 0;
    }

    // Method to add a player to the achievement
    addPlayer(playerId) {
		// Ensure the players array is defined
		if (!Array.isArray(this.players)) {
			this.players = [];
		}
	
		let dateAchieved = new Date().toISOString();
		if (!this.players.includes(playerId)) {
			this.players.push(playerId);
			this.playerDates[playerId] = dateAchieved; // Store the date the player obtained the achievement
			console.log("Farchievements | Added Achievement to: " + playerId);
			if (this.progressType === "diceChain") {
				this.playerProgress[playerId] = this.progressRequired;
			}
		}
	}
    // Method to remove a player from the achievement
    removePlayer(playerId) {
        const playerIndex = this.players.indexOf(playerId);
        if (playerIndex > -1) {
            this.players.splice(playerIndex, 1); // Remove the player from the players array
            delete this.playerDates[playerId]; // Remove the associated date from playerDates
            console.log("Farchievements | Removed Achievement from: " + playerId);
        }

        const seenByIndex = this.seenBy.indexOf(playerId);
        if (seenByIndex > -1) {
            this.seenBy.splice(seenByIndex, 1); // Remove the player from the seenBy array if present
            console.log("Farchievements | Removed Achievement from: " + playerId);
        }
		if(this.progressType == "diceChain")
			this.playerProgress[playerId] = 0;
    }
	// Method to mark that a player has seen the achievement animation
	markSeen(playerId) {
		if (!this.seenBy.includes(playerId)) {
			this.seenBy.push(playerId); // Add player to seenBy array if they haven't seen it yet
			console.log("Farchievements | Achievement was seen by: " + playerId);
		}
	}
}

/** Explicit compatibility adapter for legacy name-based macros. */
window.Farchievements.DisplayAchievementPopupByName = function (achievementName, playerId = "") {
    const achievementId = window.PF2eAchievements.AchievementStore.resolveAchievementId(achievementName);
    if (!achievementId) { ui.notifications.warn(`Farchievements | Achievement '${achievementName}' was not uniquely resolved.`); return false; }
    return window.Farchievements.DisplayAchievementPopup(achievementId, playerId);
};
