using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeSparkKids.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCourseDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Name_En = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Name_Ar = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description_En = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description_Ar = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Order = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Courses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Title_En = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Title_Ar = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Subtitle_En = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Subtitle_Ar = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Summary_En = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Summary_Ar = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description_En = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Description_Ar = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    DeliveryType = table.Column<int>(type: "int", nullable: false),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    AgeBand = table.Column<int>(type: "int", nullable: false),
                    MinAge = table.Column<int>(type: "int", nullable: false),
                    MaxAge = table.Column<int>(type: "int", nullable: false),
                    PublishState = table.Column<int>(type: "int", nullable: false),
                    IsListed = table.Column<bool>(type: "bit", nullable: false),
                    PrimaryCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Pricing_Model = table.Column<int>(type: "int", nullable: false),
                    Pricing_Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    Pricing_Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    Media_ThumbnailKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_ThumbnailAlt = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_HeroKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_PromoVideoUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ArchivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LearningPaths",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Title_En = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Title_Ar = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Summary_En = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Summary_Ar = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AgeBand = table.Column<int>(type: "int", nullable: false),
                    PublishState = table.Column<int>(type: "int", nullable: false),
                    IsListed = table.Column<bool>(type: "bit", nullable: false),
                    Media_ThumbnailKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_ThumbnailAlt = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_HeroKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Media_PromoVideoUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ArchivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningPaths", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CourseInstructors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InstructorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleOnCourse = table.Column<int>(type: "int", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseInstructors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseInstructors_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CourseModules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title_En = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Title_Ar = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Summary_En = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Summary_Ar = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseModules_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CourseOutcomes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text_En = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Text_Ar = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseOutcomes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseOutcomes_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LearningPathItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    LearningPathId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningPathItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LearningPathItems_LearningPaths_LearningPathId",
                        column: x => x.LearningPathId,
                        principalTable: "LearningPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_IsActive_Order",
                table: "Categories",
                columns: new[] { "IsActive", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseInstructors_CourseId_InstructorUserId",
                table: "CourseInstructors",
                columns: new[] { "CourseId", "InstructorUserId" },
                unique: true,
                filter: "[CourseId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CourseModules_CourseId_Order",
                table: "CourseModules",
                columns: new[] { "CourseId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_CourseOutcomes_CourseId_Order",
                table: "CourseOutcomes",
                columns: new[] { "CourseId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_Courses_DeletedAt",
                table: "Courses",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_PrimaryCategoryId",
                table: "Courses",
                column: "PrimaryCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Courses_PublishState_IsListed",
                table: "Courses",
                columns: new[] { "PublishState", "IsListed" });

            migrationBuilder.CreateIndex(
                name: "IX_Courses_Slug",
                table: "Courses",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LearningPathItems_CourseId",
                table: "LearningPathItems",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_LearningPathItems_LearningPathId_Order",
                table: "LearningPathItems",
                columns: new[] { "LearningPathId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_DeletedAt",
                table: "LearningPaths",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_PublishState_IsListed",
                table: "LearningPaths",
                columns: new[] { "PublishState", "IsListed" });

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_Slug",
                table: "LearningPaths",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "CourseInstructors");

            migrationBuilder.DropTable(
                name: "CourseModules");

            migrationBuilder.DropTable(
                name: "CourseOutcomes");

            migrationBuilder.DropTable(
                name: "LearningPathItems");

            migrationBuilder.DropTable(
                name: "Courses");

            migrationBuilder.DropTable(
                name: "LearningPaths");
        }
    }
}
