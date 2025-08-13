import Foundation

class Movie: Codable {
    var id: String
    var title: String
    var genre: String
    var date: Date
    var rating: Float
    var description: String
    var longDescription: String
    var actors: [String]
    var realisator: String

    init(id: String, title: String, genre: String, date: Date, rating: Float, description: String, longDescription: String, actors: [String], realisator: String) {
        self.id = id
        self.title = title
        self.genre = genre
        self.date = date
        self.rating = rating
        self.description = description
        self.longDescription = longDescription
        self.actors = actors
        self.realisator = realisator
    }

    static func == (lhs: Movie, rhs: Movie) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
