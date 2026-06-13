"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationalContext = getOperationalContext;
const data_1 = require("@/lib/data");
function getOperationalContext(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        void userId;
        const [actionQueue, reviewQueue, blockerQueue] = yield Promise.all([
            (0, data_1.getUserActionQueue)(),
            (0, data_1.getUserReviewQueue)(),
            (0, data_1.getUserBlockerQueue)(),
        ]);
        return {
            actionQueue,
            reviewQueue,
            blockerQueue,
        };
    });
}
