/**
 * This script contains functions that need to be run in the context of the webpage
 */
import { parsePhoneNumber } from 'libphonenumber-js';
import {
    EVENTS,
    EVENT_SOURCES,
    EXPORT_MODES,
    ISO_COUNTRY_CODES,
    GROUP_TYPES,
    CUSTOM_EVENT_NAME,
} from './constants';
import moduleRaid from './moduleRaider';

if (!window.Store) {
    (function () {
        function getStore(modules) {
            let foundCount = 0;
            let neededObjects = [
                {
                    id: 'ContactAttributes',
                    conditions: (module) =>
                        module.getIsMyContact ? module : null,
                },
                {
                    id: 'Store',
                    conditions: (module) =>
                        module.default &&
                        module.default.Chat &&
                        module.default.Msg
                            ? module.default
                            : null,
                },
                {
                    id: 'MediaCollection',
                    conditions: (module) =>
                        module.default &&
                        module.default.prototype &&
                        module.default.prototype.processAttachments
                            ? module.default
                            : null,
                },
                {
                    id: 'MediaProcess',
                    conditions: (module) => (module.BLOB ? module : null),
                },
                {
                    id: 'Wap',
                    conditions: (module) =>
                        module.createGroup ? module : null,
                },
                {
                    id: 'ServiceWorker',
                    conditions: (module) =>
                        module.default && module.default.killServiceWorker
                            ? module
                            : null,
                },
                {
                    id: 'State',
                    conditions: (module) =>
                        module.STATE && module.STREAM ? module : null,
                },
                {
                    id: 'WapDelete',
                    conditions: (module) =>
                        module.sendConversationDelete &&
                        module.sendConversationDelete.length == 2
                            ? module
                            : null,
                },
                {
                    id: 'Conn',
                    conditions: (module) =>
                        module.default &&
                        module.default.ref &&
                        module.default.refTTL
                            ? module.default
                            : null,
                },
                {
                    id: 'WapQuery',
                    conditions: (module) =>
                        module.default && module.default.queryExist
                            ? module.default
                            : null,
                },
                {
                    id: 'CryptoLib',
                    conditions: (module) =>
                        module.decryptE2EMedia ? module : null,
                },
                {
                    id: 'OpenChat',
                    conditions: (module) =>
                        module.default &&
                        module.default.prototype &&
                        module.default.prototype.openChat
                            ? module.default
                            : null,
                },
                {
                    id: 'UserConstructor',
                    conditions: (module) =>
                        module.default &&
                        module.default.prototype &&
                        module.default.prototype.isServer &&
                        module.default.prototype.isUser
                            ? module.default
                            : null,
                },
                {
                    id: 'SendTextMsgToChat',
                    conditions: (module) =>
                        module.sendTextMsgToChat
                            ? module.sendTextMsgToChat
                            : null,
                },
                {
                    id: 'SendSeen',
                    conditions: (module) =>
                        module.sendSeen ? module.sendSeen : null,
                },
                {
                    id: 'sendDelete',
                    conditions: (module) =>
                        module.sendDelete ? module.sendDelete : null,
                },
                {
                    id: 'Label',
                    conditions: (module) =>
                        module.LABEL_PROPERTIES ? module.default : null,
                },
            ];
            for (let idx in modules) {
                if (typeof modules[idx] === 'object' && modules[idx] !== null) {
                    neededObjects.forEach((needObj) => {
                        if (!needObj.conditions || needObj.foundedModule)
                            return;
                        let neededModule = needObj.conditions(modules[idx]);
                        if (neededModule !== null) {
                            foundCount++;
                            needObj.foundedModule = neededModule;
                        }
                    });

                    if (foundCount === neededObjects.length) {
                        break;
                    }
                }
            }

            let neededStore = neededObjects.find(
                (needObj) => needObj.id === 'Store',
            );
            window.Store = neededStore.foundedModule
                ? neededStore.foundedModule
                : {};
            neededObjects.splice(neededObjects.indexOf(neededStore), 1);
            neededObjects.forEach((needObj) => {
                if (needObj.foundedModule) {
                    window.Store[needObj.id] = needObj.foundedModule;
                }
            });

            window.Store.Chat.modelClass.prototype.sendMessage = function (e) {
                window.Store.SendTextMsgToChat(this, ...arguments);
            };

            return window.Store;
        }

        const modules = window.require('__debug')?.modulesMap || {};
        if (Object.keys(modules)) {
            /**
             * Using window.require to avoid webpack from resolving the module
             */
            window.Store = {};
            window.Store = moduleRaid.find(
                (module) =>
                    module.default && module.default.Chat && module.default.Msg,
            )?.default;
            window.Store.ContactAttributes = moduleRaid.find(
                (module) => module.getIsMyContact,
            );
        } else if (typeof webpackJsonp === 'function') {
            window.webpackJsonp([], { parasite: (x, y, z) => getStore(z) }, [
                'parasite',
            ]);
        } else if (window.webpackChunkwhatsapp_web_client) {
            let tag = new Date().getTime();
            window.webpackChunkwhatsapp_web_client.push([
                ['parasite' + tag],
                {},
                function (o, e, t) {
                    let modules = [];
                    for (let idx in o.m) {
                        let module = o(idx);
                        modules.push(module);
                    }
                    getStore(modules);
                },
            ]);
        } else {
            alert(`WAXP Lite extension failed to connect to WhatsApp`);
        }
    })();
}

const insertParentStyles = () => {
    const styles = `
    .--hide-chatlist-data #pane-side span[title] img, .--hide-chatlist-data #pane-side span[title] svg {
        display: none;
    }
    @media screen and (prefers-color-scheme: light) {
        .--hide-chatlist-data #pane-side span[title] {
            border-radius: 100px;
            background: rgb(106 114 114 / 13%);
            color: transparent;
        }
    }
    @media screen and (prefers-color-scheme: dark) {
        .--hide-chatlist-data #pane-side span[title] {
            border-radius: 100px;
            background: rgb(255 255 255 / 8%);
            color: transparent;
        }
    }
    .--blur-chats .message-in,  .--blur-chats .message-out{
        filter: blur(4px);
    }`;
    const style = document.createElement('style');
    style.innerHTML = styles;
    document.head.appendChild(style);
};
insertParentStyles();

window.WAXP = {
    lastRead: {},
};

const getAllChats = () => {
    const chats = window.Store.Chat.getModelsArray();
    return chats;
};

const getGroupMetadata = async (id, done) => {
    let output = window.Store.GroupMetadata.get(id);
    if (output !== undefined) {
        if (output.stale) {
            await window.Store.GroupMetadata.update(id); // instead of output.update()
        }
    }
    if (done !== undefined) done(output);
    return output;
};

var TRIAL = true;
var FORMAT_NUMBERS = true;
var COUNTRY_NAME = true;
var EXCLUDE_SELF = false;

const maskString = (str, unmaskedChars) => {
    // Mask any non white space character
    return str.slice(0, unmaskedChars) + str.replaceAll(/[^\s\\]/g, '*');
};

const isUser = (contact) => {
    return window.Store.ContactAttributes.getIsUser(contact);
};

const isGroup = (contact) => {
    return window.Store.ContactAttributes.getIsGroup(contact);
};

const isMyContact = (contact) => {
    return window.Store.ContactAttributes.getIsMyContact(contact);
};

const isBroadcast = (contact) => {
    return window.Store.ContactAttributes.getIsBroadcast(contact);
};

const prepareDataForDownload = (data) => {
    console.log(`WAXP: Starting contacts download`);
    const FREE_LIMIT = 4;
    let j = 0;

    const contactData = data[data.type];
    for (let [key, _data] of Object.entries(contactData)) {
        const metadata = _data.metadata;
        for (const [i, contact] of _data.contacts.entries()) {
            let name = contact.name;
            let phone = contact.phone;
            contact.lastContacted = contact.lastContacted
                ? new Date(contact.lastContacted * 1000).toLocaleString()
                : null;

            if (name === 'undefined') {
                name = `Unknown Contact ${++j}`;
            }

            try {
                if (FORMAT_NUMBERS) {
                    phone = parsePhoneNumber('+' + phone);
                    contact.phone = phone.formatInternational();
                    contact.countryCallingCode = phone.countryCallingCode;
                }
            } catch (error) {
                console.log(
                    'Failed to parse phone number. Defaulting to non formatted number.',
                );
            }

            if (TRIAL && i >= FREE_LIMIT) {
                contact.name = maskString(name, 5);
                contact.phone = maskString(contact.phone, 4);
                contact.lastContacted = '****';
                contact.countryCallingCode = '**';
            }

            try {
                if (TRIAL && i >= FREE_LIMIT && COUNTRY_NAME) {
                    contact.country = '****';
                } else if (COUNTRY_NAME) {
                    const countryCode = phone.country;
                    const countryName = ISO_COUNTRY_CODES[countryCode];
                    contact.country = countryName;
                    contact.countryCallingCode = phone.countryCallingCode;
                }
            } catch (error) {
                console.log('Failed to get country code.');
                contact.country = '-';
                contact.countryCallingCode = '-';
            }
        }
    }

    const event = {
        origin: EVENT_SOURCES.DOM,
        destination: EVENT_SOURCES.CONTENT_SCRIPT,
        eventType: EVENTS.DOWNLOAD_CONTACTS,
        eventPayload: data,
    };

    console.log(`Event::${EVENTS.DOWNLOAD_CONTACTS}`, event);
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: event }));
};

function exportContactsFromSelectedLabel(label, allOrUnsaved) {
    const labels = window.Store.Label.getModelsArray();
    const labelItem = labels.find((l) => l.name === label);
    let labelExportByFallbackApproach = false;
    try {
        var groups = new RegExp(/(?<phone_g>[\d]+)-[\d]+@g.us/);
        var chat = new RegExp(/(?<phone_c>[\d]+)@c.us/);
        var finalRe = new RegExp(groups.source + '|' + chat.source);
        var contacts = Array.from(
            new Set(
                labelItem.labelItemCollection._models.map((m) => {
                    var id = m.__x_parentId;
                    if (id.includes('@broadcast')) return false;
                    var e = id.match(finalRe).groups;
                    return e.phone_g || e.phone_c;
                }),
            ),
        );
        const filteredContacts = filterLabelContacts(
            contacts,
            label,
            allOrUnsaved,
        );
        return filteredContacts;
    } catch (e) {
        labelExportByFallbackApproach = true;
    }

    if (labelExportByFallbackApproach) {
        try {
            console.log('Attempting fallback approach...');
            const groups = new RegExp(/(?<phone_g>[\d]+)-[\d]+@g.us/);
            const chat = new RegExp(/(?<phone_c>[\d]+)@c.us/);
            const finalRe = new RegExp(groups.source + '|' + chat.source);
            let contacts = Array.from(
                new Set(
                    labelItem.labelItemCollection._models.map((m) => {
                        let id = m.__x_parentId;
                        if (id.includes('@broadcast')) return false;
                        let e = id.match(finalRe)?.groups;
                        if (!e) {
                            console.log(`Cannot extract number from ${id}`);
                        }
                        return e?.phone_g || e?.phone_c || null;
                    }),
                ),
            );
            contacts = contacts.filter(Boolean);
            const filteredContacts = filterLabelContacts(
                contacts,
                label,
                allOrUnsaved,
            );
            return filteredContacts;
        } catch (error) {
            alert(
                'An error occurred when extracting contacts from labels\n' +
                    'If this happens again, contact codegenasite@gmail.com for help with the following details\n\n' +
                    error.stack,
            );
            console.error(error);
        }
    }
}

function filterLabelContacts(contacts, label, allOrUnsaved) {
    console.log(`Filtering contacts.. allOrUnsaved=${allOrUnsaved}`);
    let contactsForExport = [];
    // Remove falsy values from array
    contacts = contacts.filter(Boolean);

    if (EXCLUDE_SELF) {
        let self = window.Store.Contact._models
            .filter((t) => t.isMe)
            .map((t) => t.id.user)[0];
        contacts = contacts.filter((c) => c !== self);
    }

    if (allOrUnsaved === 'all') {
        contacts.forEach((c) => {
            var x = window.Store.Contact._models.filter((t) => t.id.user === c);
            if (x[0]) {
                const lastContacted = getLastContactedDateTime(
                    x[0].id._serialized,
                );
                contactsForExport.push({
                    name: getContactName(x[0]),
                    phone: c,
                    labelName: label,
                    lastContacted,
                    isArchived: isArchived(x[0].id),
                });
            }
        });
    } else {
        var un = window.Store.Contact._models.filter(
            (t) => !isMyContact(t) && !isGroup(t),
        );
        contacts.forEach((c) => {
            var x = un.filter((t) => t.id.user === c);
            if (x.length > 0) {
                const lastContacted = getLastContactedDateTime(
                    x[0].id._serialized,
                );
                contactsForExport.push({
                    name: getContactName(x[0]),
                    phone: c,
                    labelName: label,
                    lastContacted,
                    isArchived: isArchived(x[0].id),
                });
            }
        });
    }

    return contactsForExport;
}

function getLastContactedDateTime(contact_id_serialized) {
    try {
        return (
            window.Store.Chat._models.find(
                (c) => c.id._serialized === contact_id_serialized,
            )?.t || undefined
        );
    } catch (error) {
        return undefined;
    }
}

const getContactName = (contact) => {
    let defaultName = `w-${contact.id.user}`;
    if (contact.id.server === 'lid' && contact.displayNameLID) {
        defaultName = `w-${contact.displayNameLID}`;
    }
    let _name = defaultName;
    if (contact.name && contact.name !== contact.id.user) {
        _name = contact.name;
    } else if (contact.verifiedName) {
        _name = contact.verifiedName;
    } else if (contact.pushname && contact.pushname !== contact.id.user) {
        _name = contact.pushname;
    }
    return _name;
};

const excludeCommunity = (group) => {
    const metadata = window.Store.GroupMetadata.get(group.id);
    if ([GROUP_TYPES.COMMUNITY].includes(metadata?.groupType)) return false;
    return true;
};

const isArchived = (id) => {
    const chat = window.Store.Chat.get(id);
    return Boolean(chat?.archive);
};

const fetchRequiredDataEventHandler = () => {
    const active = window.Store.Chat.getActive();
    const groups = window.Store.Contact.getGroupContacts()
        .filter(excludeCommunity)
        .map((c) => ({
            name: c.name,
            id: c.id._serialized,
            // checked: c.id._serialized === active?.id?._serialized,
            count: window.Store.GroupMetadata.get(c.id._serialized).participants
                .length,
        }));
    const meContact = window.Store.Contact.getMeContact();
    const labels = window.Store?.Label?.getModelsArray() || [];
    const reply = {
        me: meContact.id,
        isBusinessUser: meContact.isBusiness,
        groups: groups,
        labels: labels.map((l) => ({
            name: l.name,
            id: l.id,
        })),
        openGroupSerializedId: active?.id?._serialized,
    };
    return reply;
};

/**
 * Exports chatlist contacts
 * @param {Array} filters
 */
const exportChatlistContacts = (filters) => {
    let contacts = getAllChats().filter((val) => val.id.server === 'c.us');

    const filterOnlyUnsaved = filters.find(
        (f) => f.id === 'exportOnlyUnsaved',
    )?.checked;
    if (filterOnlyUnsaved) {
        contacts = contacts.filter((val) => !isMyContact(val.contact));
    }
    contacts = contacts.map((e) => {
        const lastContacted = e.t;
        return {
            name: getContactName(e.contact),
            phone: e.id.user,
            lastContacted,
            isArchived: isArchived(e.id),
        };
    });

    const fileName = 'Chatlist_' + (filterOnlyUnsaved ? 'Unsaved' : 'All');
    prepareDataForDownload({
        type: EXPORT_MODES.CHATLIST,
        fileName: getFormattedFileName(fileName),
        filters,
        chatlist: {
            chatlist: {
                metadata: {
                    name: 'chatlist',
                },
                contacts,
            },
        },
    });
};

/**
 * Exports contacts from given groups
 * @param {Array} groupSelection
 * @param {Array} filters
 * @returns
 */
const exportGroupContacts = (groupSelection, filters) => {
    const groups = {};
    if (filters.find((f) => f.id === 'exportAllGroups')?.checked) {
        groupSelection = window.Store.Contact.getGroupContacts().map((g) => ({
            id: g.id._serialized,
            name: g.name,
        }));
    }
    for (const selectedGroup of groupSelection) {
        const { name: groupName, id: groupId } = selectedGroup;
        let contacts = window.Store.GroupMetadata.get(groupId).participants;
        const filterOnlyUnsaved = filters.find(
            (f) => f.id === 'exportOnlyUnsaved',
        )?.checked;
        if (filterOnlyUnsaved) {
            contacts = contacts.filter((val) => !isMyContact(val.contact));
        }
        contacts = contacts.map((participant) => {
            const lastContacted = getLastContactedDateTime(
                participant.contact.id._serialized,
            );
            let phoneNumber;
            if (participant.id.server === 'lid') {
                phoneNumber =
                    participant?.phoneNumber?.user ||
                    'HIDDEN_BY_PRIVACY_SETTINGS';
            } else {
                phoneNumber = participant?.id?.user;
            }
            return {
                name: getContactName(participant.contact),
                phone: phoneNumber,
                lastContacted: lastContacted,
                isAdmin: participant.isAdmin,
                groupName: groupName,
                isArchived: isArchived(participant.id),
            };
        });
        groups[groupId] = {
            metadata: {
                id: groupId,
                name: groupName,
            },
            contacts,
        };
    }

    prepareDataForDownload({
        type: EXPORT_MODES.GROUPS,
        fileName: getFormattedFileName(`Groups`),
        filter: filters,
        groups,
    });
};

/**
 * Export contacts from labels
 * @param {Array} labelSelection
 * @param {Array} filters
 */
const exportLabelContacts = (labelSelection, filters) => {
    const labels = {};
    for (const selectedLabel of labelSelection) {
        const { name: labelName, id: labelId } = selectedLabel;
        const filterOnlyUnsaved = filters.find(
            (f) => f.id === 'exportOnlyUnsaved',
        )?.checked;
        let contacts = exportContactsFromSelectedLabel(
            labelName,
            filterOnlyUnsaved ? 'unsaved' : 'all',
            '',
        );
        if (filterOnlyUnsaved) {
            contacts = contacts.filter((val) => !isMyContact(val.contact));
        }
        labels[labelId] = {
            metadata: {
                id: labelId,
                name: labelName,
            },
            contacts,
        };
    }

    prepareDataForDownload({
        type: EXPORT_MODES.LABELS,
        fileName: getFormattedFileName(`Labels`),
        filter: filters,
        labels,
    });
};

window.addEventListener(CUSTOM_EVENT_NAME, async (_event) => {
    const event = { data: _event.detail };

    if (event.data.destination !== EVENT_SOURCES.DOM) return;

    console.log(`WAXP: Message recieved`, event.data);
    if (event.data.origin === EVENT_SOURCES.POPUP) {
        let reply;
        switch (event.data.eventType) {
            case EVENTS.FETCH_REQUIRED_DATA: {
                reply = await fetchRequiredDataEventHandler();
                break;
            }
            case 'fetchCustomerInfo': {
                reply = window.Store.Contact.getMeContact().id;
                break;
            }
            case 'fetchAllGroups': {
                reply = window.Store.Contact.getGroupContacts().map((c) => ({
                    name: c.name,
                    id: c.id._serialized,
                }));
                break;
            }
            case EVENTS.TOGGLE_BLUR_CHATS: {
                document.body.classList.toggle('--hide-chatlist-data');
                document.body.classList.toggle('--blur-chats');
                break;
            }
            default: {
                console.log(event.data.eventType);
                break;
            }
        }
        return window.dispatchEvent(
            new CustomEvent(CUSTOM_EVENT_NAME, {
                detail: {
                    origin: EVENT_SOURCES.DOM,
                    destination: EVENT_SOURCES.POPUP,
                    eventType: EVENTS.REPLY,
                    eventPayload: {
                        messageId: event.data.eventPayload.messageId,
                        reply: reply,
                    },
                },
            }),
        );
    } else if (event.data.origin === EVENT_SOURCES.CONTENT_SCRIPT) {
        switch (event.data.eventType) {
            case EVENTS.DOWNLOAD_COMPLETE: {
                return;
            }
            case EVENTS.EXPORT_CONTACTS: {
                const exportConfig = event.data.eventPayload;
                TRIAL = exportConfig.isUsingTrial;
                if (exportConfig.exportMode === EXPORT_MODES.CHATLIST) {
                    exportChatlistContacts(exportConfig.filters);
                } else if (exportConfig.exportMode === EXPORT_MODES.GROUPS) {
                    exportGroupContacts(
                        exportConfig.selectedItems,
                        exportConfig.filters,
                    );
                } else if (exportConfig.exportMode === EXPORT_MODES.LABELS) {
                    exportLabelContacts(
                        exportConfig.selectedItems,
                        exportConfig.filters,
                    );
                }
                break;
            }
            default: {
                break;
            }
        }
    }
});

function getFormattedFileName(fileName) {
    fileName = fileName.replace(/[^\d\w\s]/g, '') ? fileName.replace(/[^\d\w\s]/g, '') : 'WAXP-group-members';
    const d = new Date();
    fileName = `${fileName} ${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}.xlsx`;
    return fileName;
}
