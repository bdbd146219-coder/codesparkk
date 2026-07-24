using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeSparkKids.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogInterestLeads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CatalogInterestLeads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    SourceSlug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SourceTitleSnapshot = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    ParentName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    ChildAge = table.Column<int>(type: "int", nullable: true),
                    PreferredLanguage = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ContactedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ArchivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AdminNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogInterestLeads", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogInterestLeads_CreatedAt",
                table: "CatalogInterestLeads",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogInterestLeads_Status",
                table: "CatalogInterestLeads",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogInterestLeads");
        }
    }
}
