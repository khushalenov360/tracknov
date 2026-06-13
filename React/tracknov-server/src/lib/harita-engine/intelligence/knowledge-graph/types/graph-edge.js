"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRelationship = void 0;
var GraphRelationship;
(function (GraphRelationship) {
    GraphRelationship["REQUIRES"] = "REQUIRES";
    GraphRelationship["SATISFIES"] = "SATISFIES";
    GraphRelationship["ASSIGNED_TO"] = "ASSIGNED_TO";
    GraphRelationship["BLOCKS"] = "BLOCKS";
    GraphRelationship["DEPENDS_ON"] = "DEPENDS_ON";
    GraphRelationship["SUPPORTS"] = "SUPPORTS";
    GraphRelationship["CONTRIBUTES_TO"] = "CONTRIBUTES_TO";
    GraphRelationship["APPROVED_BY"] = "APPROVED_BY";
    GraphRelationship["CREATED_BY"] = "CREATED_BY";
    GraphRelationship["AFFECTS_CERTIFICATION"] = "AFFECTS_CERTIFICATION";
    GraphRelationship["REDUCES_RISK"] = "REDUCES_RISK";
    GraphRelationship["IMPROVES_READINESS"] = "IMPROVES_READINESS";
})(GraphRelationship || (exports.GraphRelationship = GraphRelationship = {}));
