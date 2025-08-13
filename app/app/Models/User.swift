import Foundation

class User: Hashable, ObservableObject, Codable {
    var id: String?
    var name: String
    var onGoingMovies: [String]?
    
    init(id: String?, name: String, onGoingMovies: [String] = []) {
        self.id = id
        self.name = name
        self.onGoingMovies = onGoingMovies
    }

    static func == (lhs: User, rhs: User) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
